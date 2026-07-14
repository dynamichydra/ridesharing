import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { vehicleTypes } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { detectZone } from '../zone/zone.service.js';
import { getActiveRulesForVehicle } from './fare-rules.service.js';
import { getApplicableTaxRules } from './tax-rules.service.js';
import { getRate } from '../vehicle-type/vehicle-type-pricing.service.js';
import { getDefaultCountry, getCountryById } from '../geo/geo.service.js';
import { isTimeInRange } from '../../utils/time.js';
import { getRouteData } from '../../utils/maps.js';      // shared — no duplicate Client
import { fromMinor, roundToIncrement } from '../../utils/money.js';

/**
 * Main fare calculator.
 * Uses shared getRouteData() — Google Maps or haversine fallback.
 * Country is resolved from the pickup point (via zone match, falling back to the
 * deployment's default country) — riders aren't pinned to one country the way drivers are,
 * so this can't come from a stored profile field.
 * Returns full breakdown; snapshot is stored on the ride row at request time.
 */
export async function calculateFare({ pickupLat, pickupLng, dropLat, dropLng, vehicleTypeId }) {
  // Cache key — round coords to ~100 m precision
  const cacheKey = REDIS_KEYS.fareCache(
    `${vehicleTypeId}:${(+pickupLat).toFixed(3)},${(+pickupLng).toFixed(3)}` +
    `:${(+dropLat).toFixed(3)},${(+dropLng).toFixed(3)}`,
  );
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 1. Vehicle type catalog (name/capacity — physical attributes only, no rates here)
  const [vt] = await db.select().from(vehicleTypes)
    .where(eq(vehicleTypes.id, vehicleTypeId)).limit(1);
  if (!vt) throw { statusCode: 404, message: 'Vehicle type not found' };

  // 2. Resolve zone + country from the pickup point
  const zone      = await detectZone(parseFloat(pickupLat), parseFloat(pickupLng));
  const country    = zone ? await getCountryById(zone.countryId) : await getDefaultCountry();
  const currencyCode = country.currencyCode;

  // 3. Country-specific rate card for this vehicle type
  const pricing = await getRate(vehicleTypeId, country.id);

  // 4. Route data (shared utility)
  const route = await getRouteData(
    parseFloat(pickupLat), parseFloat(pickupLng),
    parseFloat(dropLat),   parseFloat(dropLng),
  );
  const { distanceKm, durationMin, durationInTrafficMin, trafficDelayS, polyline, bounds } = route;

  // 5. Base calculation — all integer minor units from here on
  const baseFareMinor     = pricing.baseRateMinor;
  const distanceFareMinor = Math.round(distanceKm * pricing.perKmRateMinor);
  const timeFareMinor     = Math.round(durationInTrafficMin * pricing.perMinRateMinor);
  const subtotalMinor     = baseFareMinor + distanceFareMinor + timeFareMinor;

  // 6. Zone multiplier
  const zoneMultiplier = zone ? parseFloat(zone.multiplier) : 1.0;

  // 7. Dynamic fare rules — evaluated in the country's local time, not server time
  const rules          = await getActiveRulesForVehicle(vehicleTypeId, country.id);
  let   surgeMultiplier = 1.0;
  const appliedSurges  = [];

  for (const rule of rules) {
    let matches = false;
    if (rule.ruleType === 'time' && rule.startTime && rule.endTime) {
      matches = isTimeInRange(rule.startTime, rule.endTime, rule.daysOfWeek, country.timezone);
    }
    if (rule.ruleType === 'traffic') {
      matches = trafficDelayS >= (rule.trafficDelayS ?? 300);
    }
    if (rule.ruleType === 'zone' && rule.zoneId) {
      matches = zone?.id === rule.zoneId;
    }
    if (matches) {
      surgeMultiplier *= parseFloat(rule.multiplier);
      appliedSurges.push({ name: rule.name, ruleType: rule.ruleType, multiplier: rule.multiplier });
    }
  }

  const totalBeforeMinMinor = Math.round(subtotalMinor * zoneMultiplier * surgeMultiplier);
  const minFareApplied      = totalBeforeMinMinor < pricing.minFareMinor;
  const preTaxFareMinor     = Math.max(totalBeforeMinMinor, pricing.minFareMinor);

  // 8. Tax — exclusive rules add on top; inclusive rules are informational only
  //    (already priced into the rate card by whoever set it).
  const taxRulesList  = await getApplicableTaxRules(country.id, 'fare');
  const exclusiveRate = taxRulesList.filter((r) => !r.isInclusive)
    .reduce((sum, r) => sum + parseFloat(r.rate), 0);
  const taxMinor       = Math.round(preTaxFareMinor * exclusiveRate);

  const estimatedFareMinor = roundToIncrement(preTaxFareMinor + taxMinor, country.roundingIncrementMinor);

  const result = {
    vehicleTypeId,
    vehicleTypeName: vt.name,
    countryId:   country.id,
    currencyCode,
    distanceKm:      parseFloat(distanceKm.toFixed(3)),
    durationMin,
    durationInTrafficMin,
    polyline,
    bounds,
    breakdown: {
      baseFareMinor,
      distanceFareMinor,
      timeFareMinor,
      subtotalMinor,
      zone:            zone ? { id: zone.id, name: zone.name, multiplier: zone.multiplier } : null,
      zoneMultiplier,
      surgeMultiplier: parseFloat(surgeMultiplier.toFixed(4)),
      appliedSurges,
      minFareApplied,
      taxMinor,
      taxRules: taxRulesList.map((r) => ({ name: r.name, rate: r.rate, isInclusive: r.isInclusive })),
    },
    estimatedFareMinor,
    estimatedFare: fromMinor(estimatedFareMinor, currencyCode), // major-unit convenience field for display
    currency: currencyCode,
  };

  await redis.setex(cacheKey, 120, JSON.stringify(result));
  return result;
}

export async function estimateAllTypes({ pickupLat, pickupLng, dropLat, dropLng, activeVehicleTypes }) {
  return Promise.all(
    activeVehicleTypes.map((vt) =>
      calculateFare({ pickupLat, pickupLng, dropLat, dropLng, vehicleTypeId: vt.id }).catch(() => null),
    ),
  ).then((res) => res.filter(Boolean));
}
