import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { drivers } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { latLngToHexCell, cellsForRadius, DRIVER_INDEX_RESOLUTION } from '../../utils/h3.js';

/**
 * Redis-backed reverse index of available drivers by H3 cell — mirrors
 * src/modules/zone/hex-zone.service.js's pattern, but for high-frequency driver
 * location updates instead of slow-changing zone polygons. Lets matching look up
 * "which drivers are near here" via a bounded SET union instead of a full-table
 * Haversine scan.
 */

/**
 * Adds/moves a driver's entry in the index. `at` is the event's own timestamp
 * (defaults to processing time when the caller has no better one, e.g. today's
 * location_update payload). Out-of-order-safe: an update is only applied if `at`
 * is newer than whatever timestamp is currently stored, since a driver reconnecting
 * to a different server instance (or a straggler request) can otherwise land after
 * a genuinely newer update and regress the index to a stale cell.
 */
export async function upsertDriverCell(driverId, lat, lng, resolution = DRIVER_INDEX_RESOLUTION, at = Date.now()) {
  const cell = latLngToHexCell(lat, lng, resolution);

  const currentKey = REDIS_KEYS.driverHexCurrent(driverId);
  const currentRaw = await redis.get(currentKey);
  const current = currentRaw ? JSON.parse(currentRaw) : null;

  if (current && current.updatedAt > at) return; // a newer update already landed — ignore this stale one
  if (current && current.resolution === resolution && current.cell === cell) {
    // Same cell — just bump the freshness timestamp, no SET churn needed.
    await redis.set(currentKey, JSON.stringify({ resolution, cell, updatedAt: at }));
    return;
  }

  const pipeline = redis.pipeline();
  if (current) {
    pipeline.srem(REDIS_KEYS.driverHexIndex(current.resolution, current.cell), driverId);
  }
  pipeline.sadd(REDIS_KEYS.driverHexIndex(resolution, cell), driverId);
  pipeline.sadd(REDIS_KEYS.driverHexResolutions, String(resolution));
  pipeline.set(currentKey, JSON.stringify({ resolution, cell, updatedAt: at }));
  await pipeline.exec();
}

/**
 * Removes a driver from the index entirely — called on go_offline, disconnect,
 * and ride acceptance (driver moves to on_trip, no longer an available candidate).
 * A stale "available" entry left behind causes failed offers downstream, so this
 * must run promptly on every one of those transitions.
 */
export async function removeDriverFromIndex(driverId) {
  const currentKey = REDIS_KEYS.driverHexCurrent(driverId);
  const currentRaw = await redis.get(currentKey);
  if (!currentRaw) return;
  const { resolution, cell } = JSON.parse(currentRaw);

  const pipeline = redis.pipeline();
  pipeline.srem(REDIS_KEYS.driverHexIndex(resolution, cell), driverId);
  pipeline.del(currentKey);
  await pipeline.exec();
}

/**
 * Rebuilds the entire Redis index from Postgres. Only needed after a cold Redis
 * (first boot, flushed cache) — normal operation keeps the index current via
 * upsertDriverCell/removeDriverFromIndex on every location/status change.
 */
async function rebuildIndexFromDb() {
  const online = await db.select({
    id: drivers.id, currentLat: drivers.currentLat, currentLng: drivers.currentLng,
  }).from(drivers).where(and(eq(drivers.isOnline, true)));

  for (const d of online) {
    if (d.currentLat != null && d.currentLng != null) {
      await upsertDriverCell(d.id, parseFloat(d.currentLat), parseFloat(d.currentLng));
    }
  }
}

/**
 * The candidate lookup: bounds a gridDisk around (lat,lng) sized for radiusKm,
 * unions the Redis SETs for those cells, and returns the driver-ID pool. Callers
 * still apply exact Haversine distance + eligibility filters on this narrowed set —
 * this only replaces the "which drivers could possibly be nearby" full-scan step.
 */
export async function getCandidateDriverIds(lat, lng, radiusKm) {
  let resolutions = await redis.smembers(REDIS_KEYS.driverHexResolutions);
  if (resolutions.length === 0) {
    await rebuildIndexFromDb();
    resolutions = await redis.smembers(REDIS_KEYS.driverHexResolutions);
    if (resolutions.length === 0) return [];
  }

  const idSets = await Promise.all(
    resolutions.flatMap((resolution) =>
      cellsForRadius(lat, lng, radiusKm, Number(resolution)).map((cell) =>
        redis.smembers(REDIS_KEYS.driverHexIndex(resolution, cell)),
      ),
    ),
  );
  return [...new Set(idSets.flat())];
}
