import { redis, REDIS_KEYS } from '../../config/redis.js';
import { latLngToHexCell } from '../../utils/h3.js';
import { db } from '../../config/db.js';
import { rides, drivers } from '../../../drizzle/schema/index.js';
import { and, eq, sql } from 'drizzle-orm';

/**
 * Supply & Demand Metrics Service
 *
 * Tracks spatial driver supply vs rider demand per H3 cell and Zone
 * to optimize matching radius, surge multiplier, and repositioning.
 */

const SUPPLY_DEMAND_CACHE_TTL = 30; // 30s cache

/**
 * Calculates supply/demand ratio around a pickup location (H3 cell).
 * Ratio > 1.0 indicates oversupply (many available drivers per searching ride).
 * Ratio < 0.5 indicates high demand / undersupply.
 */
export async function getSupplyDemandRatio(lat, lng, resolution = 7) {
  const cell = latLngToHexCell(lat, lng, resolution);
  const cacheKey = `metric:supply_demand:${resolution}:${cell}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return parseFloat(cached);
  } catch (err) {
    // Cache read error non-fatal
  }

  // Count available drivers in this H3 cell
  const driverCount = await redis.scard(REDIS_KEYS.driverHexIndex(resolution, cell)).catch(() => 0);

  // Count searching rides within the last 5 minutes in this general area
  const [searchingRow] = await db
    .select({
      count: sql`COUNT(*)`,
    })
    .from(rides)
    .where(
      and(
        eq(rides.status, 'searching'),
        sql`requested_at >= NOW() - INTERVAL '5 minutes'`,
        sql`(6371 * acos(
          LEAST(1.0,
            cos(radians(${lat})) * cos(radians(pickup_lat::float))
            * cos(radians(pickup_lng::float) - radians(${lng}))
            + sin(radians(${lat})) * sin(radians(pickup_lat::float))
          )
        )) <= 5.0`
      )
    );

  const searchingRides = Math.max(1, Number(searchingRow?.count || 1));
  const availableDrivers = Number(driverCount || 0);

  const ratio = Math.round((availableDrivers / searchingRides) * 100) / 100;

  try {
    await redis.setex(cacheKey, SUPPLY_DEMAND_CACHE_TTL, String(ratio));
  } catch (err) {
    // Cache write error non-fatal
  }

  return ratio;
}

/**
 * Returns macro-level supply and demand metrics for a zone.
 */
export async function getZoneSupplyDemand(zoneId) {
  const [driverRow] = await db
    .select({ count: sql`COUNT(*)` })
    .from(drivers)
    .where(and(eq(drivers.isOnline, true), eq(drivers.approvalStatus, 'approved')));

  const [rideRow] = await db
    .select({ count: sql`COUNT(*)` })
    .from(rides)
    .where(eq(rides.status, 'searching'));

  const availableDrivers = Number(driverRow?.count || 0);
  const searchingRides = Number(rideRow?.count || 0);

  return {
    zoneId,
    availableDrivers,
    searchingRides,
    ratio: searchingRides > 0 ? Math.round((availableDrivers / searchingRides) * 100) / 100 : 1.0,
    timestamp: new Date().toISOString(),
  };
}
