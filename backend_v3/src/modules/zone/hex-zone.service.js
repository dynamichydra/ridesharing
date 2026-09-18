import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { zones } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { polygonToHexCells, latLngToHexCell, DEFAULT_RESOLUTION } from '../../utils/h3.js';
import { getById } from './zone.service.js';

/**
 * Derives hexCells from a zone's stored polygon (source of truth) at the given resolution,
 * persists them, and rebuilds the Redis reverse index. Safe to re-run any time the desired
 * resolution changes.
 */
export async function generateHexCells(zoneId, resolution = DEFAULT_RESOLUTION) {
  const zone = await getById(zoneId);
  const hexCells = polygonToHexCells(zone.polygon, resolution);

  const [updated] = await db.update(zones)
    .set({ hexCells, resolution, updatedAt: new Date() })
    .where(eq(zones.id, zoneId))
    .returning();

  await rebuildHexIndexForZone(updated);
  return updated;
}

/**
 * Diffs a zone's previously-indexed "resolution:cell" pairs against its current hexCells and
 * updates the Redis reverse index accordingly. Runs as a pipeline since a zone can have
 * hundreds of cells.
 */
export async function rebuildHexIndexForZone(zone) {
  const cellsKey = REDIS_KEYS.hexZoneCells(zone.id);
  const oldEntries = await redis.smembers(cellsKey);

  const newEntries = (zone.hexCells ?? []).map((cell) => `${zone.resolution}:${cell}`);
  const newEntrySet = new Set(newEntries);
  const staleEntries = oldEntries.filter((entry) => !newEntrySet.has(entry));

  const pipeline = redis.pipeline();

  for (const entry of staleEntries) {
    const [res, cell] = entry.split(':');
    pipeline.srem(REDIS_KEYS.hexZoneIndex(res, cell), zone.id);
    pipeline.srem(cellsKey, entry);
  }

  for (const entry of newEntries) {
    const [res, cell] = entry.split(':');
    pipeline.sadd(REDIS_KEYS.hexZoneIndex(res, cell), zone.id);
    pipeline.sadd(cellsKey, entry);
    pipeline.sadd(REDIS_KEYS.hexZoneResolutions, res);
  }

  if (staleEntries.length || newEntries.length) await pipeline.exec();
}

/**
 * Rebuilds the entire Redis reverse index from Postgres. Only needed after a cold Redis
 * (first boot, flushed cache) — normal operation keeps the index current via
 * rebuildHexIndexForZone on zone writes.
 */
async function rebuildIndexFromDb() {
  const allZones = await db.select().from(zones)
    .where(and(eq(zones.isActive, true)));
  for (const zone of allZones) {
    if (zone.hexCells?.length && zone.resolution != null) {
      await rebuildHexIndexForZone(zone);
    }
  }
}

/**
 * The point-in-zone lookup: resolves a coordinate to its H3 cell at each resolution currently
 * in use, hash-looks-up matching zones (O(1)-ish — bounded by the number of distinct
 * resolutions in play, not the number of zones), and returns active matches ordered by
 * priority (most specific zone first). Returns [] when no zone matches.
 */
export async function resolveHexZones(lat, lng) {
  let resolutions = await redis.smembers(REDIS_KEYS.hexZoneResolutions);

  if (resolutions.length === 0) {
    await rebuildIndexFromDb();
    resolutions = await redis.smembers(REDIS_KEYS.hexZoneResolutions);
    if (resolutions.length === 0) return [];
  }

  const zoneIdSets = await Promise.all(
    resolutions.map((resolution) => {
      const cell = latLngToHexCell(lat, lng, Number(resolution));
      return redis.smembers(REDIS_KEYS.hexZoneIndex(resolution, cell));
    }),
  );
  const zoneIds = [...new Set(zoneIdSets.flat())];
  if (zoneIds.length === 0) return [];

  const rows = await db.select().from(zones)
    .where(and(inArray(zones.id, zoneIds), eq(zones.isActive, true)));

  return sortZonesByPrecedence(rows);
}

/**
 * Extracted as a pure function so overlap/precedence behavior is unit-testable without
 * Redis or Postgres. Higher priority = more specific = wins (e.g. airport over city surge).
 */
export function sortZonesByPrecedence(zoneList) {
  return [...zoneList].sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1));
}
