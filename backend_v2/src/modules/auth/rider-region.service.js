import geoip from 'geoip-lite';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { countries, cities } from '../../../drizzle/schema/index.js';
import { validateLocationInServiceArea } from '../geo/service-area.service.js';

/**
 * Rider region lock — the customer app only works in India and Canada, with a phone number
 * from the country the rider is physically in.
 *
 * The app sends a fresh GPS fix plus device signals (mock location, VPN) to
 * POST /auth/rider/region-check. The server decides the country itself — reverse-geocoding
 * the coordinates and cross-checking the request IP's country — and, if allowed, issues a
 * short-lived signed region token. That token is required to send/verify a rider OTP (and the
 * phone must match its country) and on every authenticated rider request (X-Region-Token).
 *
 * None of this makes spoofing impossible (a rooted device can lie about GPS *and* route
 * through an in-country proxy), but it closes the easy paths: fake-GPS apps, VPNs, picking
 * another country's dial code, or calling the API directly.
 */

export const RIDER_COUNTRIES = ['IN', 'CA'];
export const REGION_TOKEN_PURPOSE = 'rider_region';
export const REGION_TOKEN_TTL = '30m';

const MAX_FIX_AGE_MS = 2 * 60 * 1000; // the app must send a fresh fix, not a cached one
const MAX_ACCURACY_M = 25_000; // country-level decision; rejects only absurd fixes

// Canadian geographic area codes (CRTC/CNA). +1 is shared with the US and Caribbean, so the
// area code is what tells a Canadian number apart. New overlays must be added here.
export const CANADIAN_AREA_CODES = new Set([
  204, 226, 236, 249, 250, 257, 263, 289, 306, 343, 354, 365, 367, 368, 382, 403, 416, 418,
  428, 431, 437, 438, 450, 460, 468, 474, 506, 514, 519, 548, 579, 581, 584, 587, 604, 613,
  639, 647, 672, 683, 705, 709, 742, 753, 778, 780, 782, 807, 819, 825, 867, 873, 879, 902,
  905, 942,
].map(String));

const COUNTRY_NAMES = { IN: 'India', CA: 'Canada' };
const ACCOUNT_ADJECTIVE = { IN: 'an Indian', CA: 'a Canadian' };

/**
 * A rider account only works in the country it registered in. Used when an account from one
 * supported country is opened in the other (e.g. an Indian account while in Canada).
 */
export function accountCountryMismatchMessage(accountCountry, currentCountry) {
  const home = COUNTRY_NAMES[accountCountry] || 'another country';
  const here = COUNTRY_NAMES[currentCountry];
  return here
    ? `This account is registered in ${home} and only works there. You're in ${here} now — please log in with ${ACCOUNT_ADJECTIVE[currentCountry]} account.`
    : `This account is registered in ${home} and only works there.`;
}

export class RegionError extends Error {
  constructor(code, message, statusCode = 403) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function isRegionEnforcementEnabled() {
  return String(env.RIDER_REGION_ENFORCEMENT ?? 'off').toLowerCase() === 'on';
}

/** E.164 phone → 'IN' | 'CA' | null (anything else, incl. US numbers). */
// strictCanadianAreaCodes: false (region lock off, i.e. local development) accepts any valid
// +1 number as Canadian, so test numbers work; production keeps the CNA area-code list.
export function riderPhoneCountry(phone, { strictCanadianAreaCodes = true } = {}) {
  const p = String(phone || '').replace(/[\s\-()]/g, '');
  if (/^\+91[6-9]\d{9}$/.test(p)) return 'IN';
  const nanp = p.match(/^\+1([2-9]\d{2})[2-9]\d{6}$/);
  if (nanp && (!strictCanadianAreaCodes || CANADIAN_AREA_CODES.has(nanp[1]))) return 'CA';
  return null;
}

/** Country of the request's public IP, or null for private/loopback/unknown addresses. */
export function ipCountry(ip) {
  if (!ip) return null;
  const clean = String(ip).replace(/^::ffff:/, '');
  const hit = geoip.lookup(clean);
  return hit?.country || null;
}

async function reverseGeocodeCountry(lat, lng) {
  if (!env.GOOGLE_MAPS_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=country&key=${env.GOOGLE_MAPS_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const body = await res.json();
  if (body.status === 'ZERO_RESULTS') return 'ZZ'; // ocean / unclaimed — never a rider country
  if (body.status !== 'OK') return null;
  for (const result of body.results || []) {
    const comp = (result.address_components || []).find((c) => c.types?.includes('country'));
    if (comp?.short_name) return comp.short_name.toUpperCase();
  }
  return null;
}

async function serviceAreaCountry(lat, lng) {
  const area = await validateLocationInServiceArea(lat, lng);
  if (!area?.isAvailable || !area.countryId) return null;
  const [country] = await db.select({ isoCode: countries.isoCode })
    .from(countries).where(eq(countries.id, area.countryId)).limit(1);
  return country?.isoCode?.toUpperCase() || null;
}

/** ISO country of a coordinate — Google reverse geocode (cached), else our city polygons. */
export async function countryFromCoordinates(lat, lng) {
  const key = `region:geo:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  try {
    const cached = await redis.get(key);
    if (cached) return cached;
  } catch { /* cache is best-effort */ }

  let iso = null;
  try {
    iso = await reverseGeocodeCountry(lat, lng);
  } catch (e) {
    console.warn('[RiderRegion] reverse geocode failed:', e.message);
  }
  if (!iso) iso = await serviceAreaCountry(lat, lng);

  if (iso) {
    try { await redis.setex(key, 30 * 86400, iso); } catch { /* best-effort */ }
  }
  return iso;
}

/**
 * The active service city (and its state) containing the point, if any — used to give a new
 * rider a home city/state at signup. Null outside every configured city boundary, or on a
 * fresh setup with no city polygons yet.
 */
export async function resolveServiceCity(lat, lng, countryId = null) {
  try {
    const area = await validateLocationInServiceArea(lat, lng);
    if (!area?.isAvailable || area.isFallback || !area.cityId) return null;
    if (countryId && area.countryId !== countryId) return null;
    const [city] = await db.select({ id: cities.id, name: cities.name, stateId: cities.stateId })
      .from(cities).where(eq(cities.id, area.cityId)).limit(1);
    return city ? { cityId: city.id, cityName: city.name, stateId: city.stateId } : null;
  } catch {
    return null; // a city is a nice-to-have at signup; never block on it
  }
}

async function countryInfo(iso) {
  const [row] = await db.select({ id: countries.id, name: countries.name, isoCode: countries.isoCode, dialCode: countries.dialCode })
    .from(countries).where(eq(countries.isoCode, iso)).limit(1);
  return row || { id: null, name: iso === 'IN' ? 'India' : 'Canada', isoCode: iso, dialCode: iso === 'IN' ? '+91' : '+1' };
}

/**
 * Decides whether this device may use the rider app right now. Throws RegionError with a
 * machine-readable code; the app routes REGION_UNAVAILABLE to its "not available" screen and
 * shows the others as fix-it messages (turn off VPN / fake GPS, retry).
 */
export async function checkRiderRegion({ lat, lng, accuracyM, fixAgeMs, isMocked, isVpn, ip }) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) {
    throw new RegionError('LOCATION_REQUIRED', 'A current GPS location is required to use Ryva.', 400);
  }
  if (isMocked === true) {
    throw new RegionError('MOCK_LOCATION', 'Fake or mock location detected. Turn off any location-spoofing app and try again.');
  }
  if (isVpn === true) {
    throw new RegionError('VPN_DETECTED', 'Ryva cannot be used over a VPN or proxy. Please turn it off and try again.');
  }
  if (fixAgeMs != null && Number(fixAgeMs) > MAX_FIX_AGE_MS) {
    throw new RegionError('STALE_LOCATION', 'Could not get a fresh GPS fix. Please move to an open area and try again.', 400);
  }
  if (accuracyM != null && Number(accuracyM) > MAX_ACCURACY_M) {
    throw new RegionError('LOW_ACCURACY', 'Your location is too imprecise. Enable precise location and try again.', 400);
  }

  const gpsCountry = await countryFromCoordinates(la, ln);
  if (!gpsCountry) {
    throw new RegionError('LOCATION_UNRESOLVED', 'We could not verify your location right now. Please try again.', 503);
  }
  if (!RIDER_COUNTRIES.includes(gpsCountry)) {
    throw new RegionError('REGION_UNAVAILABLE', 'Ryva is currently not available in your location.');
  }

  const netCountry = ipCountry(ip);
  if (netCountry && netCountry !== gpsCountry) {
    throw new RegionError(
      'NETWORK_LOCATION_MISMATCH',
      'Your network location does not match your GPS location. Turn off any VPN, proxy or location-spoofing app and try again.',
    );
  }

  const info = await countryInfo(gpsCountry);
  const place = await resolveServiceCity(la, ln, info.id);
  return {
    allowed: true,
    countryCode: gpsCountry,
    countryName: info.name,
    dialCode: info.dialCode,
    countryId: info.id,
    cityId: place?.cityId ?? null,
    cityName: place?.cityName ?? null,
    stateId: place?.stateId ?? null,
  };
}

export function issueRegionToken(app, region, ip) {
  return app.jwt.sign(
    {
      purpose: REGION_TOKEN_PURPOSE,
      country: region.countryCode,
      ipCountry: ipCountry(ip),
      // Where the rider was verified — assigned as their home city/state at signup.
      cityId: region.cityId || null,
      stateId: region.stateId || null,
    },
    { expiresIn: REGION_TOKEN_TTL },
  );
}

/**
 * Verifies a region token and re-checks the caller's current IP country against it (so a
 * token minted at home can't be replayed through a foreign VPN). Returns the country.
 */
export function verifyRegionToken(app, token, ip) {
  if (!token) throw new RegionError('REGION_CHECK_REQUIRED', 'Location verification required.', 403);
  let payload;
  try {
    payload = app.jwt.verify(token);
  } catch {
    throw new RegionError('REGION_CHECK_REQUIRED', 'Location verification expired. Please verify your location again.', 403);
  }
  if (payload.purpose !== REGION_TOKEN_PURPOSE || !RIDER_COUNTRIES.includes(payload.country)) {
    throw new RegionError('REGION_CHECK_REQUIRED', 'Location verification required.', 403);
  }
  const netCountry = ipCountry(ip);
  if (netCountry && netCountry !== payload.country) {
    throw new RegionError(
      'NETWORK_LOCATION_MISMATCH',
      'Your network location does not match your verified location. Turn off any VPN or proxy and try again.',
    );
  }
  return payload.country;
}

/** The phone must belong to the country the rider was verified in. */
export function assertPhoneMatchesRegion(phone, regionCountry) {
  const phoneCountry = riderPhoneCountry(phone, { strictCanadianAreaCodes: isRegionEnforcementEnabled() });
  if (!phoneCountry) {
    throw new RegionError(
      'PHONE_NOT_SUPPORTED',
      regionCountry === 'CA'
        ? 'Enter a valid Canadian mobile number.'
        : 'Enter a valid Indian mobile number.',
      400,
    );
  }
  if (phoneCountry !== regionCountry) {
    throw new RegionError(
      'PHONE_COUNTRY_MISMATCH',
      `You are in ${regionCountry === 'IN' ? 'India' : 'Canada'} — please use a ${regionCountry === 'IN' ? 'Indian (+91)' : 'Canadian (+1)'} mobile number.`,
      400,
    );
  }
}

/**
 * City/state from a region token, without enforcing it (enforcement is verifyRegionToken's
 * job). Null when the token is missing/invalid or wasn't issued for [country].
 */
export function regionPlaceFromToken(app, token, country) {
  if (!token) return null;
  try {
    const p = app.jwt.verify(token);
    if (p.purpose !== REGION_TOKEN_PURPOSE || p.country !== country) return null;
    return { cityId: p.cityId || null, stateId: p.stateId || null };
  } catch {
    return null;
  }
}
