import { redis, REDIS_KEYS } from '../../../config/redis.js';
import { calculateSurgeMultiplier } from './surge-calculator.js';

/**
 * Resolves the real-time surge multiplier for a given pickup coordinate, zone, and traffic delay.
 */
export async function getDynamicSurge({
  pickupLat,
  pickupLng,
  zoneId = null,
  trafficDelayS = 0,
  minMultiplier = 1.0,
  maxMultiplier = 3.0,
}) {
  try {
    // 1. Check if an admin override or cached surge exists for this zone
    if (zoneId) {
      const overrideKey = `surge:zone:${zoneId}:override`;
      const cachedOverride = await redis.get(overrideKey);
      if (cachedOverride) {
        const parsed = parseFloat(cachedOverride);
        if (!isNaN(parsed) && parsed >= 1.0) {
          return {
            multiplier: Math.min(maxMultiplier, Math.max(minMultiplier, parsed)),
            ratio: null,
            reason: 'Admin surge override',
          };
        }
      }
    }

    // 2. Query available drivers count via Redis geospatial index (e.g. drivers within 3 km)
    let supply = 5;
    try {
      const geoResults = await redis.georadius(
        REDIS_KEYS.driversGeo,
        pickupLng,
        pickupLat,
        3,
        'km',
        'COUNT',
        20,
      );
      if (Array.isArray(geoResults)) {
        supply = geoResults.length;
      }
    } catch (_) {
      // If georadius fails or key empty, default supply
      supply = 5;
    }

    // 3. Query recent ride requests count in Redis (if tracked)
    let demand = 3;
    try {
      const demandKey = zoneId ? `demand:zone:${zoneId}` : `demand:geo:${pickupLat.toFixed(2)}:${pickupLng.toFixed(2)}`;
      const cachedDemand = await redis.get(demandKey);
      if (cachedDemand) demand = parseInt(cachedDemand, 10);
    } catch (_) {}

    return calculateSurgeMultiplier({
      demand,
      supply,
      trafficDelayS,
      minMultiplier,
      maxMultiplier,
    });
  } catch (error) {
    return {
      multiplier: 1.0,
      ratio: 1.0,
      reason: 'Standard rate (fallback)',
    };
  }
}
