import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { tripGpsPings } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { haversineKm } from '../../utils/geo.js';
import { metrics } from '../../utils/metrics.js';

// Launch defaults — tune once real GPS/matching data exists (see README).
export const NOISE_MAX_ACCURACY_M = 50;
export const NOISE_MAX_SPEED_KMH = 180;
export const GAP_THRESHOLD_S = 90;

/**
 * Pure predicates — no DB/Redis access, unit-testable in isolation.
 * `prevValidPing` is the last ping that itself wasn't rejected as noise, or
 * null for the first ping in a trip.
 */
export function isNoisePing(ping, prevValidPing) {
  if (ping.accuracy != null && ping.accuracy > NOISE_MAX_ACCURACY_M) return true;
  if (!prevValidPing) return false;

  const dtHours = (ping.recordedAt - prevValidPing.recordedAt) / 3_600_000;
  if (dtHours <= 0) return true; // out-of-order/duplicate timestamp
  const impliedKm = haversineKm(prevValidPing.lat, prevValidPing.lng, ping.lat, ping.lng);
  const impliedSpeedKmh = impliedKm / dtHours;
  return impliedSpeedKmh > NOISE_MAX_SPEED_KMH;
}

export function isGap(ping, prevValidPing) {
  if (!prevValidPing) return false;
  const dtS = (ping.recordedAt - prevValidPing.recordedAt) / 1000;
  return dtS >= GAP_THRESHOLD_S;
}

/**
 * Classifies a raw ping against the trip's running "last valid ping" state and
 * returns the flags to persist. Callers pass the trip's current prevValidPing
 * (or null) and get back the ping's isNoise/gapFlag plus the new prevValidPing
 * to carry forward (unchanged if this ping was noise).
 */
export function classifyPing(ping, prevValidPing) {
  const noise = isNoisePing(ping, prevValidPing);
  if (noise) return { isNoise: true, gapFlag: false, nextPrevValidPing: prevValidPing };
  const gap = isGap(ping, prevValidPing);
  return { isNoise: false, gapFlag: gap, nextPrevValidPing: ping };
}

/**
 * Buffers a raw ping in Redis during an active trip — NOT inserted into
 * Postgres per-ping (thousands of pings/sec across concurrent trips would mean
 * one INSERT per ping; a BullMQ worker batch-flushes instead, see
 * src/jobs/index.js). Noise/gap classification happens at flush time against
 * the buffered sequence, not here, since it needs the trip's ping history.
 */
export async function bufferGpsPing(rideId, driverId, lat, lng, { accuracy, speedKmh, recordedAt } = {}) {
  const ping = {
    driverId, lat, lng,
    accuracy: accuracy ?? null,
    speedKmh: speedKmh ?? null,
    recordedAt: recordedAt ? new Date(recordedAt).getTime() : Date.now(),
  };
  await redis.pipeline()
    .rpush(REDIS_KEYS.gpsPingBuffer(rideId), JSON.stringify(ping))
    .sadd(REDIS_KEYS.gpsActiveRides, rideId)
    .exec();
}

/** Called once a trip ends (finalize-trip.job.js) — stops the periodic worker
 * from scanning this ride any further. */
export async function markRideGpsInactive(rideId) {
  await redis.srem(REDIS_KEYS.gpsActiveRides, rideId);
}

/** Rides currently buffering pings — the periodic flush worker's scan list. */
export async function listActiveGpsRides() {
  return redis.smembers(REDIS_KEYS.gpsActiveRides);
}

/**
 * Drains the current Redis buffer for a ride, classifies each ping against the
 * trip's running noise/gap state, and bulk-inserts into trip_gps_pings. Shared
 * by the periodic mid-trip flush worker (jobs/index.js) and the trip-end
 * finalize job — both just need "persist whatever's buffered right now."
 *
 * Threads noise/gap state across multiple flushes of the same trip by seeding
 * `prevValidPing` from the last already-persisted non-noise row, rather than
 * keeping extra Redis state that could drift from the durable table.
 */
export async function flushRidePings(rideId) {
  const pings = await drainGpsPingBuffer(rideId);
  if (pings.length === 0) return { flushed: 0 };

  const [lastValidRow] = await db.select().from(tripGpsPings)
    .where(and(eq(tripGpsPings.rideId, rideId), eq(tripGpsPings.isNoise, false)))
    .orderBy(desc(tripGpsPings.recordedAt)).limit(1);

  let prevValidPing = lastValidRow
    ? { lat: parseFloat(lastValidRow.lat), lng: parseFloat(lastValidRow.lng), recordedAt: lastValidRow.recordedAt.getTime() }
    : null;

  const rows = [];
  for (const ping of pings) {
    const { isNoise, gapFlag, nextPrevValidPing } = classifyPing(ping, prevValidPing);
    prevValidPing = nextPrevValidPing;
    metrics.gpsPingClassifiedTotal.inc({ classification: isNoise ? 'noise' : gapFlag ? 'gap' : 'valid' });
    rows.push({
      rideId,
      driverId: ping.driverId,
      lat: String(ping.lat),
      lng: String(ping.lng),
      accuracy: ping.accuracy != null ? String(ping.accuracy) : null,
      speedKmh: ping.speedKmh != null ? String(ping.speedKmh) : null,
      recordedAt: new Date(ping.recordedAt),
      isNoise,
      gapFlag,
    });
  }

  await db.insert(tripGpsPings).values(rows);
  return { flushed: rows.length, noiseRejected: rows.filter((r) => r.isNoise).length };
}

/**
 * Drains and deletes a ride's ping buffer — called by the periodic flush
 * worker and by the trip-end finalize job. Uses a MULTI so the read+delete is
 * atomic — a ping RPUSHed by a concurrent location_update either lands fully
 * before this transaction (and is drained) or fully after (starts a fresh list
 * under the same key), never lost in between.
 */
export async function drainGpsPingBuffer(rideId) {
  const key = REDIS_KEYS.gpsPingBuffer(rideId);
  const [[, raw]] = await redis.multi().lrange(key, 0, -1).del(key).exec();
  return raw.map((r) => JSON.parse(r)).sort((a, b) => a.recordedAt - b.recordedAt);
}
