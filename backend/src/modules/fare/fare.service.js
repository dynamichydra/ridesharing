import { eq }                          from 'drizzle-orm';
import { db }                          from '../../config/db.js';
import { vehicleTypes }               from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS }          from '../../config/redis.js';
import { detectZone }                 from '../zone/zone.service.js';
import { getActiveRulesForVehicle }   from './fare-rules.service.js';
import { isTimeInRange }              from '../../utils/time.js';
import { getRouteData }               from '../../utils/maps.js';      // shared — no duplicate Client

/**
 * Main fare calculator.
 * Uses shared getRouteData() — Google Maps or haversine fallback.
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

  // 1. Vehicle type base rates
  const [vt] = await db.select().from(vehicleTypes)
    .where(eq(vehicleTypes.id, vehicleTypeId)).limit(1);
  if (!vt) throw { statusCode: 404, message: 'Vehicle type not found' };

  // 2. Route data (shared utility)
  const route = await getRouteData(
    parseFloat(pickupLat), parseFloat(pickupLng),
    parseFloat(dropLat),   parseFloat(dropLng),
  );
  const { distanceKm, durationMin, durationInTrafficMin, trafficDelayS, polyline, bounds } = route;

  // 3. Base calculation
  const baseFare     = parseFloat(vt.baseRate);
  const distanceFare = distanceKm              * parseFloat(vt.perKmRate);
  const timeFare     = durationInTrafficMin    * parseFloat(vt.perMinRate);
  const subtotal     = baseFare + distanceFare + timeFare;

  // 4. Zone multiplier
  const zone           = await detectZone(parseFloat(pickupLat), parseFloat(pickupLng));
  const zoneMultiplier = zone ? parseFloat(zone.multiplier) : 1.0;

  // 5. Dynamic fare rules
  const rules          = await getActiveRulesForVehicle(vehicleTypeId);
  let   surgeMultiplier = 1.0;
  const appliedSurges  = [];

  for (const rule of rules) {
    let matches = false;
    if (rule.ruleType === 'time' && rule.startTime && rule.endTime) {
      matches = isTimeInRange(rule.startTime, rule.endTime, rule.daysOfWeek);
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

  const totalBeforeMin = subtotal * zoneMultiplier * surgeMultiplier;
  const minFare        = parseFloat(vt.minFare ?? 0);
  const estimatedFare  = Math.ceil(Math.max(totalBeforeMin, minFare));

  const result = {
    vehicleTypeId,
    vehicleTypeName: vt.name,
    distanceKm:      parseFloat(distanceKm.toFixed(3)),
    durationMin,
    durationInTrafficMin,
    polyline,
    bounds,
    breakdown: {
      baseFare:       parseFloat(baseFare.toFixed(2)),
      distanceFare:   parseFloat(distanceFare.toFixed(2)),
      timeFare:       parseFloat(timeFare.toFixed(2)),
      subtotal:       parseFloat(subtotal.toFixed(2)),
      zone:            zone ? { id: zone.id, name: zone.name, multiplier: zone.multiplier } : null,
      zoneMultiplier,
      surgeMultiplier: parseFloat(surgeMultiplier.toFixed(4)),
      appliedSurges,
      minFareApplied:  totalBeforeMin < minFare,
    },
    estimatedFare,
    currency: 'INR',
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
