import { Client } from '@googlemaps/google-maps-services-js';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { vehicleTypes } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { detectZone } from '../zone/zone.service.js';
import { getActiveRulesForVehicle } from './fare-rules.service.js';
import { isTimeInRange } from '../../utils/time.js';
import { env } from '../../config/env.js';

const mapsClient = new Client({});

/**
 * Fetch distance + duration from Google Maps Distance Matrix API.
 * Returns { distanceKm, durationMin, durationInTrafficMin, trafficDelayS, polyline }
 */
async function getRouteData(pickupLat, pickupLng, dropLat, dropLng) {
  if (!env.GOOGLE_MAPS_KEY) {
    // Fallback: haversine estimate (dev mode)
    const { haversineKm } = await import('../../utils/geo.js');
    const distanceKm = haversineKm(pickupLat, pickupLng, dropLat, dropLng);
    const durationMin = Math.ceil((distanceKm / 25) * 60); // assume 25 km/h avg city speed
    return { distanceKm, durationMin, durationInTrafficMin: durationMin, trafficDelayS: 0, polyline: null };
  }

  const res = await mapsClient.distancematrix({
    params: {
      origins: [`${pickupLat},${pickupLng}`],
      destinations: [`${dropLat},${dropLng}`],
      departure_time: 'now',
      traffic_model: 'best_guess',
      key: env.GOOGLE_MAPS_KEY,
    },
  });

  const element = res.data.rows[0].elements[0];
  if (element.status !== 'OK') throw { statusCode: 422, message: 'Could not calculate route' };

  const distanceKm = element.distance.value / 1000;
  const durationMin = Math.ceil(element.duration.value / 60);
  const durationInTrafficMin = Math.ceil((element.duration_in_traffic?.value ?? element.duration.value) / 60);
  const trafficDelayS = (element.duration_in_traffic?.value ?? element.duration.value) - element.duration.value;

  // Directions API for polyline (optional — only if key available)
  let polyline = null;
  try {
    const dir = await mapsClient.directions({
      params: {
        origin: `${pickupLat},${pickupLng}`,
        destination: `${dropLat},${dropLng}`,
        key: env.GOOGLE_MAPS_KEY,
      },
    });
    polyline = dir.data.routes[0]?.overview_polyline?.points ?? null;
  } catch { /* non-critical */ }

  return { distanceKm, durationMin, durationInTrafficMin, trafficDelayS, polyline };
}

/**
 * Main fare calculator.
 * Returns full breakdown — snapshot is stored on the ride record.
 */
export async function calculateFare({ pickupLat, pickupLng, dropLat, dropLng, vehicleTypeId }) {
  // Cache key — round coords to ~100m precision
  const cacheKey = REDIS_KEYS.fareCache(
    `${vehicleTypeId}:${(+pickupLat).toFixed(3)},${(+pickupLng).toFixed(3)}:${(+dropLat).toFixed(3)},${(+dropLng).toFixed(3)}`,
  );
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 1. Vehicle type base rates
  const [vt] = await db.select().from(vehicleTypes).where(eq(vehicleTypes.id, vehicleTypeId)).limit(1);
  if (!vt) throw { statusCode: 404, message: 'Vehicle type not found' };

  // 2. Route data from Google Maps
  const { distanceKm, durationMin, durationInTrafficMin, trafficDelayS, polyline } =
    await getRouteData(pickupLat, pickupLng, dropLat, dropLng);

  // 3. Base calculation
  const baseFare = parseFloat(vt.baseRate);
  const distanceFare = distanceKm * parseFloat(vt.perKmRate);
  const timeFare = durationInTrafficMin * parseFloat(vt.perMinRate);
  const subtotal = baseFare + distanceFare + timeFare;

  // 4. Zone multiplier (pickup point)
  const zone = await detectZone(parseFloat(pickupLat), parseFloat(pickupLng));
  const zoneMultiplier = zone ? parseFloat(zone.multiplier) : 1.0;

  // 5. Dynamic fare rules (time-of-day, traffic, etc.)
  const rules = await getActiveRulesForVehicle(vehicleTypeId);
  let surgeMultiplier = 1.0;
  const appliedSurges = [];

  for (const rule of rules) {
    let matches = false;

    if (rule.ruleType === 'time' && rule.startTime && rule.endTime) {
      matches = isTimeInRange(rule.startTime, rule.endTime, rule.daysOfWeek);
    }

    if (rule.ruleType === 'traffic') {
      const threshold = rule.trafficDelayS ?? 300; // default 5 min
      matches = trafficDelayS >= threshold;
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
  const minFare = parseFloat(vt.minFare ?? 0);
  const estimatedFare = Math.ceil(Math.max(totalBeforeMin, minFare));

  const result = {
    vehicleTypeId,
    vehicleTypeName: vt.name,
    distanceKm: parseFloat(distanceKm.toFixed(3)),
    durationMin,
    durationInTrafficMin,
    polyline,
    breakdown: {
      baseFare: parseFloat(baseFare.toFixed(2)),
      distanceFare: parseFloat(distanceFare.toFixed(2)),
      timeFare: parseFloat(timeFare.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      zone: zone ? { id: zone.id, name: zone.name, multiplier: zone.multiplier } : null,
      zoneMultiplier,
      surgeMultiplier: parseFloat(surgeMultiplier.toFixed(4)),
      appliedSurges,
      minFareApplied: totalBeforeMin < minFare,
    },
    estimatedFare,
    currency: 'INR',
  };

  // Cache 2 minutes
  await redis.setex(cacheKey, 120, JSON.stringify(result));
  return result;
}

/**
 * Estimate fares for all active vehicle types in one call.
 * Used by the rider's booking screen.
 */
export async function estimateAllTypes({ pickupLat, pickupLng, dropLat, dropLng, activeVehicleTypes }) {
  return Promise.all(
    activeVehicleTypes.map((vt) =>
      calculateFare({ pickupLat, pickupLng, dropLat, dropLng, vehicleTypeId: vt.id }).catch(() => null),
    ),
  ).then((res) => res.filter(Boolean));
}
