import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { vehicleTypes } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { detectZone } from '../zone/zone.service.js';
import { resolveHexZones } from '../zone/hex-zone.service.js';
import { getActiveRulesForVehicle } from './fare-rules.service.js';
import { getApplicableTaxRules } from './tax-rules.service.js';
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
export async function calculateFare({ pickupLat, pickupLng, dropLat, dropLng, vehicleTypeId, promoCode = null, userId = null }) {
  // Cache key — round coords to ~100 m precision
  const cacheKey = REDIS_KEYS.fareCache(
    `${vehicleTypeId}:${(+pickupLat).toFixed(3)},${(+pickupLng).toFixed(3)}` +
    `:${(+dropLat).toFixed(3)},${(+dropLng).toFixed(3)}:${promoCode || ''}:${userId || ''}`,
  );
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);


  // 1. Vehicle type catalog — name/capacity plus its flat, global rate (no per-country cards)
  const [vt] = await db.select().from(vehicleTypes)
    .where(eq(vehicleTypes.id, vehicleTypeId)).limit(1);
  if (!vt) throw { statusCode: 404, message: 'Vehicle type not found' };

  // 2. Resolve zone + country from the pickup point
  const zone      = await detectZone(parseFloat(pickupLat), parseFloat(pickupLng));
  const country    = zone ? await getCountryById(zone.countryId) : await getDefaultCountry();
  const currencyCode = country.currencyCode;

  // 2b. H3 hex-zone matches — additive precision layer alongside the polygon-matched `zone`
  // above (which only drives country resolution + the flat zoneMultiplier). Priority-ordered,
  // most specific zone first (e.g. airport before a city-wide surge zone it's nested inside).
  const hexZones   = await resolveHexZones(parseFloat(pickupLat), parseFloat(pickupLng));
  const hexZoneIds = new Set(hexZones.map((z) => z.id));

  // 3. Route data (shared utility)
  const route = await getRouteData(
    parseFloat(pickupLat), parseFloat(pickupLng),
    parseFloat(dropLat),   parseFloat(dropLng),
  );
  const { distanceKm, durationMin, durationInTrafficMin, trafficDelayS, polyline, bounds } = route;

  // 4. Base calculation — all integer minor units from here on
  const baseFareMinor     = vt.baseRateMinor;
  const distanceFareMinor = Math.round(distanceKm * vt.perKmRateMinor);
  const timeFareMinor     = Math.round(durationInTrafficMin * vt.perMinRateMinor);
  const subtotalMinor     = baseFareMinor + distanceFareMinor + timeFareMinor;

  // 5. Zone multiplier
  const zoneMultiplier = zone ? parseFloat(zone.multiplier) : 1.0;

  // 6. Dynamic fare rules — evaluated in the country's local time, not server time
  const rules          = await getActiveRulesForVehicle(vehicleTypeId, country.id);
  let   surgeMultiplier = 1.0;
  let   flatFareMinor   = null; // set by a zone rule's flatFareMinor; highest-priority match wins
  const appliedSurges  = [];
  const appliedFareRuleIds = []; // ride audit trail — traces to the exact fare_rules rows applied

  for (const rule of rules) {
    let matches = false;
    if (rule.ruleType === 'time' && rule.startTime && rule.endTime) {
      matches = isTimeInRange(rule.startTime, rule.endTime, rule.daysOfWeek, country.timezone);
    }
    if (rule.ruleType === 'traffic') {
      matches = trafficDelayS >= (rule.trafficDelayS ?? 300);
    }
    if (rule.ruleType === 'zone' && rule.zoneId) {
      matches = zone?.id === rule.zoneId || hexZoneIds.has(rule.zoneId);
    }
    if (matches) {
      if (rule.allowedVehicleTypeIds?.length && !rule.allowedVehicleTypeIds.includes(vehicleTypeId)) {
        throw { statusCode: 422, message: `Vehicle type not permitted by zone rule "${rule.name}"` };
      }
      // rules are ordered by priority DESC, so the first flat-fare match is the winner
      if (rule.flatFareMinor != null && flatFareMinor === null) {
        flatFareMinor = rule.flatFareMinor;
      } else {
        surgeMultiplier *= parseFloat(rule.multiplier);
      }
      appliedSurges.push({
        name: rule.name, ruleType: rule.ruleType, multiplier: rule.multiplier,
        ...(rule.flatFareMinor != null ? { flatFareMinor: rule.flatFareMinor } : {}),
      });
      appliedFareRuleIds.push(rule.id);
    }
  }

  const totalBeforeMinMinor = flatFareMinor != null
    ? flatFareMinor
    : Math.round(subtotalMinor * zoneMultiplier * surgeMultiplier);
  const minFareApplied      = totalBeforeMinMinor < vt.minFareMinor;
  const preTaxFareMinor     = Math.max(totalBeforeMinMinor, vt.minFareMinor);

  // 7. Tax — exclusive rules add on top; inclusive rules are informational only
  //    (already priced into the rate card by whoever set it).
  const taxRulesList  = await getApplicableTaxRules(country.id, 'fare');
  const exclusiveRate = taxRulesList.filter((r) => !r.isInclusive)
    .reduce((sum, r) => sum + parseFloat(r.rate), 0);
  const taxMinor       = Math.round(preTaxFareMinor * exclusiveRate);

  const estimatedFareMinor = roundToIncrement(preTaxFareMinor + taxMinor, country.roundingIncrementMinor);

  let promoDetails = null;
  let finalEstimatedFareMinor = estimatedFareMinor;

  if (promoCode) {
    const { validatePromoCode } = await import('../promo/promo.service.js');
    const promoResult = await validatePromoCode(promoCode, estimatedFareMinor, userId, country.id);
    promoDetails = {
      promoId: promoResult.promoId,
      code: promoResult.code,
      discountType: promoResult.discountType,
      discountValue: promoResult.discountValue,
      discountAmountMinor: promoResult.discountAmountMinor,
    };
    finalEstimatedFareMinor = promoResult.finalFareMinor;
  }

  const result = {
    vehicleTypeId,
    vehicleTypeName: vt.name,
    countryId:   country.id,
    currencyCode,
    appliedFareRuleIds,              // stamped onto rides.appliedFareRuleIds
    distanceKm:      parseFloat(distanceKm.toFixed(3)),
    durationMin,
    durationInTrafficMin,
    polyline,
    bounds,
    breakdown: {
      rate: {
        baseRateMinor:   vt.baseRateMinor,
        perKmRateMinor:  vt.perKmRateMinor,
        perMinRateMinor: vt.perMinRateMinor,
        minFareMinor:    vt.minFareMinor,
      },
      baseFareMinor,
      distanceFareMinor,
      timeFareMinor,
      subtotalMinor,
      zone:            zone ? { id: zone.id, name: zone.name, multiplier: zone.multiplier } : null,
      zoneMultiplier,
      hexZones:        hexZones.map((z) => ({ id: z.id, name: z.name, type: z.type, priority: z.priority })),
      surgeMultiplier: parseFloat(surgeMultiplier.toFixed(4)),
      flatFareMinor,
      appliedSurges,
      minFareApplied,
      taxMinor,
      taxRules: taxRulesList.map((r) => ({ name: r.name, rate: r.rate, isInclusive: r.isInclusive })),
      promo: promoDetails,
    },
    estimatedFareMinor: finalEstimatedFareMinor,
    originalEstimatedFareMinor: estimatedFareMinor,
    discountAmountMinor: promoDetails?.discountAmountMinor || 0,
    estimatedFare: fromMinor(finalEstimatedFareMinor, currencyCode),
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
