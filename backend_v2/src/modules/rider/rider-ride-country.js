import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users, countries } from '../../../drizzle/schema/index.js';
import { countryFromCoordinates } from '../auth/rider-region.service.js';

/**
 * A rider can only book rides inside their account's country (the one they registered in):
 * both pickup and drop-off — no cross-border rides, no booking a ride in the other supported
 * country. Enforced on fare options and on booking (instant and scheduled).
 *
 * A point's country is the matched service city's country when the caller already resolved
 * one (zone.service isLocationInServiceArea), otherwise the reverse-geocoded country (cached).
 */
export async function assertRideWithinAccountCountry(riderId, {
  pickupLat, pickupLng, dropLat, dropLng,
  pickupCountryId = null, dropCountryId = null,
}) {
  const [account] = await db.select({ id: countries.id, iso: countries.isoCode, name: countries.name })
    .from(users).innerJoin(countries, eq(users.countryId, countries.id))
    .where(eq(users.id, riderId)).limit(1);
  if (!account) {
    throw { statusCode: 409, code: 'ACCOUNT_COUNTRY_MISSING', message: 'Your account has no country. Please log in again.' };
  }

  const points = [
    { label: 'Pickup', code: 'PICKUP_OUTSIDE_ACCOUNT_COUNTRY', lat: pickupLat, lng: pickupLng, countryId: pickupCountryId },
    { label: 'Drop-off', code: 'DROP_OUTSIDE_ACCOUNT_COUNTRY', lat: dropLat, lng: dropLng, countryId: dropCountryId },
  ];

  for (const p of points) {
    if (p.countryId) {
      if (p.countryId !== account.id) throw outside(p, account);
      continue;
    }
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw { statusCode: 400, code: 'INVALID_COORDINATES', message: `${p.label} location is invalid.` };
    }
    const iso = await countryFromCoordinates(lat, lng);
    if (!iso) {
      throw { statusCode: 503, code: 'LOCATION_UNRESOLVED', message: `We couldn't verify the ${p.label.toLowerCase()} location. Please try again.` };
    }
    if (iso.toUpperCase() !== account.iso.toUpperCase()) throw outside(p, account);
  }
}

function outside(point, account) {
  return {
    statusCode: 400,
    code: point.code,
    message: `${point.label} must be in ${account.name}. Your account can only book rides within ${account.name}.`,
  };
}
