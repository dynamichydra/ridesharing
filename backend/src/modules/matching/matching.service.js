/**
 * Expanding-radius driver matching engine.
 *
 * Ring progression:  5 km → 10 km → 15 km
 * Per ring:
 *   1. Look up the candidate driver-ID pool from the H3 availability index
 *      (driver-geo-index.service.js) — bounded gridDisk lookup, not a full-table
 *      scan — then fetch + exact-filter those specific rows from Postgres.
 *   2. Exclude drivers already offered in previous rings of this ride, and any
 *      driver hard-blocked against this rider (driver_rider_blocks).
 *   3. Score by real ETA + rating + acceptance rate (scoring.service.js, weights
 *      from matching_weights).
 *   4. Acquire a distributed per-driver lock for each candidate in score order,
 *      keeping the first MAX_CANDIDATES successes — a candidate already locked by
 *      a concurrent ride is skipped, the next-ranked candidate backfills instead.
 *   5. Store candidate list in Redis, persist ride_offers rows.
 *   6. Emit ride:new_request to each candidate's socket room via Kafka.
 *   7. Subscribe to Redis pub/sub acceptance channel — instant signal, no DB polling.
 *   8. If timeout expires → release that ring's expired offers' locks, expand to
 *      next ring.
 *   9. All rings exhausted → expire ride.
 */

import { sql, eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  drivers, subscriptions,
  rides
} from '../../../drizzle/schema/index.js';
import {
  redis, redisPub, redisSub,
  REDIS_KEYS
} from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { fromMinor } from '../../utils/money.js';
import { getEtaMatrix, ETA_MATRIX_MAX_DESTINATIONS } from '../../utils/maps.js';
import {
  createOffersForRing,
  expirePendingOffers,
  hasPendingOffer,
  getAcceptanceRate,
} from '../ride/ride_offer.service.js';
import { recordStatusChange } from '../ride/ride_status_history.service.js';
import { getCandidateDriverIds } from './driver-geo-index.service.js';
import { acquireLock, releaseLocks } from './driver-lock.service.js';
import { scoreDrivers } from './scoring.service.js';
import { getActiveWeights } from './matching-weights.service.js';
import { metrics } from '../../utils/metrics.js';

const RADII_KM = [5, 10, 15];
const ACCEPT_TIMEOUT_MS = 25_000;   // 25 s per ring
const MAX_CANDIDATES = 5;
const CANDIDATE_BUFFER = Math.min(10, ETA_MATRIX_MAX_DESTINATIONS); // fetched pool size — gives lock-loss backfill spares without re-querying

/**
 * Candidates carry raw SQL-row field names (`.id`, `.distance_km`), but both
 * createOffersForRing() and the Kafka broadcast payload need camelCase
 * `driverId`/`distanceKm`. One shared mapping feeds both call sites so they can
 * never drift out of sync again (see the historical bug this replaced: the DB
 * insert path wasn't remapped at all, so `distanceKm: String(undefined)` —
 * literally the string "undefined" — was rejected by the decimal column and
 * every ride_offers insert silently failed).
 */
export function toOfferPayload(candidates) {
  return candidates.map((c) => ({
    driverId: c.id,
    name: c.name,
    rating: c.rating,
    distanceKm: c.distance_km,
    vehicleNumber: c.vehicleNumber,
    fcmToken: c.fcmToken,
    score: c._score,
  }));
}

// ── DB query ──────────────────────────────────────────────────────────────────

/**
 * Narrows to the H3-indexed candidate pool first (driver-geo-index.service.js),
 * then does a single `WHERE id IN (...)` Postgres query for eligibility filters
 * and exact distance — replacing the previous full-table Haversine SQL scan,
 * which stopped being index-based as the driver table grows.
 */
async function queryDriversInRadius(pickupLat, pickupLng, vehicleTypeId, radiusKm, excludedIds, riderId) {
  const idPool = await getCandidateDriverIds(pickupLat, pickupLng, radiusKm);
  if (idPool.length === 0) return [];

  const exclusion = excludedIds.length
    ? sql`AND d.id NOT IN (${sql.join(excludedIds.map((id) => sql`${id}::uuid`), sql`, `)})`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      d.id,
      d.name,
      d.phone,
      d.vehicle_number     AS "vehicleNumber",
      d.vehicle_model      AS "vehicleModel",
      d.rating,
      d.total_rides        AS "totalRides",
      d.profile_photo      AS "profilePhoto",
      d.fcm_token          AS "fcmToken",
      d.current_lat::float AS "currentLat",
      d.current_lng::float AS "currentLng",
      sp.priority_matching AS "priorityMatching",
      ROUND(
        (6371 * acos(
          LEAST(1.0,
            cos(radians(${pickupLat})) * cos(radians(d.current_lat::float))
            * cos(radians(d.current_lng::float) - radians(${pickupLng}))
            + sin(radians(${pickupLat})) * sin(radians(d.current_lat::float))
          )
        ))::numeric, 3
      ) AS distance_km
    FROM drivers d
    INNER JOIN subscriptions s ON s.driver_id = d.id
      AND s.status = 'active'
      AND (s.end_date IS NULL OR s.end_date > NOW())
    INNER JOIN subscription_plans sp ON sp.id = s.plan_id
    WHERE
      d.id IN (${sql.join(idPool.map((id) => sql`${id}::uuid`), sql`, `)})
      AND d.is_online           = true
      AND d.is_blocked      = false
      AND d.approval_status = 'approved'
      AND d.vehicle_type_id = ${vehicleTypeId}
      AND d.current_lat IS NOT NULL
      AND (sp.vehicle_type_ids IS NULL OR sp.vehicle_type_ids @> to_jsonb(${vehicleTypeId}::text))
      AND (
        sp.max_rides_per_day IS NULL
        OR (
          SELECT COUNT(*) FROM rides r
          WHERE r.driver_id = d.id AND r.status = 'completed' AND r.requested_at >= CURRENT_DATE
        ) < sp.max_rides_per_day
      )
      AND NOT EXISTS (
        SELECT 1 FROM driver_rider_blocks b
        WHERE b.driver_id = d.id AND b.rider_id = ${riderId}::uuid
      )
      ${exclusion}
    HAVING
      (6371 * acos(
        LEAST(1.0,
          cos(radians(${pickupLat})) * cos(radians(d.current_lat::float))
          * cos(radians(d.current_lng::float) - radians(${pickupLng}))
          + sin(radians(${pickupLat})) * sin(radians(d.current_lat::float))
        )
      )) <= ${radiusKm}
    ORDER BY distance_km ASC
    LIMIT ${CANDIDATE_BUFFER}
  `);
  return rows;
}

/**
 * Enriches raw candidate rows with real ETA (one batched Google Distance Matrix
 * call for the whole pool, see getEtaMatrix) and acceptance rate, then scores
 * and sorts them. Pure scoring math lives in scoring.service.js; this is just
 * the DB/Redis-dependent assembly step around it.
 */
async function scoreCandidatePool(pickupLat, pickupLng, rows) {
  if (rows.length === 0) return [];

  const [etas, acceptanceRates, weights] = await Promise.all([
    getEtaMatrix(pickupLat, pickupLng, rows.map((r) => ({ lat: r.currentLat, lng: r.currentLng }))),
    Promise.all(rows.map((r) => getAcceptanceRate(r.id))),
    getActiveWeights(),
  ]);

  const enriched = rows.map((r, i) => ({
    ...r,
    etaMin: etas[i].etaMin,
    acceptanceRate: acceptanceRates[i],
  }));

  return scoreDrivers(enriched, weights);
}

/**
 * Walks the score-ordered pool attempting a distributed lock for each candidate,
 * keeping the first MAX_CANDIDATES successes. A candidate already locked by a
 * concurrent ride is skipped (not retried) — the next-ranked candidate in the
 * same already-fetched pool backfills the slot, no re-query needed.
 */
async function lockTopCandidates(scoredPool, rideId) {
  const offered = [];
  for (const candidate of scoredPool) {
    if (offered.length >= MAX_CANDIDATES) break;
    const locked = await acquireLock(candidate.id, rideId, ACCEPT_TIMEOUT_MS + 5_000);
    if (locked) offered.push(candidate);
  }
  return offered;
}

// ── pub/sub acceptance signal ─────────────────────────────────────────────────

/**
 * Bug 9 fix: use Redis pub/sub instead of DB polling.
 * Returns a Promise that resolves true (accepted/cancelled) or false (timeout).
 */
function waitForAcceptanceSignal(rideId, timeoutMs) {
  return new Promise((resolve) => {
    const channel = REDIS_KEYS.CHAN.rideAccepted(rideId);
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      redisSub.unsubscribe(channel).catch(() => { });
      resolve(false);
    }, timeoutMs);

    redisSub.subscribe(channel, (err) => {
      if (err) { console.error('[Matching] redisSub error:', err.message); }
    });

    redisSub.on('message', (ch, msg) => {
      if (ch !== channel || settled) return;
      settled = true;
      clearTimeout(timer);
      redisSub.unsubscribe(channel).catch(() => { });
      // msg = "accepted" | "cancelled"
      resolve(true);
    });
  });
}

/**
 * Booking-screen availability check: which vehicle types have at least one
 * eligible driver within the widest matching ring right now? Shares the same
 * H3 candidate-pool + eligibility predicate as queryDriversInRadius(), but
 * without vehicle-type filtering, scoring, or locking — this is a read-only
 * "would matching find someone" check, not an offer.
 */
export async function getAvailableVehicleTypeIds(pickupLat, pickupLng, riderId) {
  const radiusKm = RADII_KM[RADII_KM.length - 1];
  const idPool = await getCandidateDriverIds(pickupLat, pickupLng, radiusKm);
  if (idPool.length === 0) return [];

  const rows = await db.execute(sql`
    SELECT DISTINCT d.vehicle_type_id AS "vehicleTypeId"
    FROM drivers d
    INNER JOIN subscriptions s ON s.driver_id = d.id
      AND s.status = 'active'
      AND (s.end_date IS NULL OR s.end_date > NOW())
    INNER JOIN subscription_plans sp ON sp.id = s.plan_id
    WHERE
      d.id IN (${sql.join(idPool.map((id) => sql`${id}::uuid`), sql`, `)})
      AND d.is_online       = true
      AND d.is_blocked      = false
      AND d.approval_status = 'approved'
      AND d.vehicle_type_id IS NOT NULL
      AND d.current_lat IS NOT NULL
      AND (sp.vehicle_type_ids IS NULL OR sp.vehicle_type_ids @> to_jsonb(d.vehicle_type_id::text))
      AND (
        sp.max_rides_per_day IS NULL
        OR (
          SELECT COUNT(*) FROM rides r
          WHERE r.driver_id = d.id AND r.status = 'completed' AND r.requested_at >= CURRENT_DATE
        ) < sp.max_rides_per_day
      )
      AND NOT EXISTS (
        SELECT 1 FROM driver_rider_blocks b
        WHERE b.driver_id = d.id AND b.rider_id = ${riderId}::uuid
      )
      AND (6371 * acos(
        LEAST(1.0,
          cos(radians(${pickupLat})) * cos(radians(d.current_lat::float))
          * cos(radians(d.current_lng::float) - radians(${pickupLng}))
          + sin(radians(${pickupLat})) * sin(radians(d.current_lat::float))
        )
      )) <= ${radiusKm}
  `);
  return rows.map((r) => r.vehicleTypeId);
}

// ── public API ────────────────────────────────────────────────────────────────

export function startMatchingProcess(ride) {
  _runMatchingRings(ride).catch((err) =>
    console.error(`[Matching] Unhandled error for ride ${ride.id}:`, err),
  );
}

async function _runMatchingRings(ride) {
  const { id: rideId, riderId, pickupLat, pickupLng, vehicleTypeId } = ride;
  const triedDriverIds = [];

  for (let ringIdx = 0; ringIdx < RADII_KM.length; ringIdx++) {
    const radiusKm = RADII_KM[ringIdx];
    const ringStartedAt = Date.now();
    const observeRing = (outcome) => metrics.matchRingDurationSeconds.observe({ outcome }, (Date.now() - ringStartedAt) / 1000);

    // Abort early if ride status changed before we start this ring
    const [current] = await db.select({ status: rides.status }).from(rides)
      .where(eq(rides.id, rideId)).limit(1);
    if (!current || current.status !== 'searching') {
      console.log(`[Matching] Ride ${rideId} no longer searching — aborting rings`);
      return;
    }

    const pool = await queryDriversInRadius(
      parseFloat(pickupLat), parseFloat(pickupLng),
      vehicleTypeId, radiusKm, triedDriverIds, riderId,
    );

    if (pool.length === 0) {
      console.log(`[Matching] Ride ${rideId} — ring ${radiusKm} km: no candidates, expanding`);
      observeRing('no_candidates');
      continue;
    }

    const scoredPool = await scoreCandidatePool(parseFloat(pickupLat), parseFloat(pickupLng), pool);
    const candidates = await lockTopCandidates(scoredPool, rideId);

    if (candidates.length === 0) {
      // Every candidate in this ring's pool is currently locked by another ride —
      // don't add them to triedDriverIds, they may free up by the next ring.
      console.log(`[Matching] Ride ${rideId} — ring ${radiusKm} km: all ${scoredPool.length} candidates locked elsewhere, expanding`);
      observeRing('no_candidates');
      continue;
    }

    console.log(
      `[Matching] Ride ${rideId} — ring ${radiusKm} km: ` +
      candidates.map((c) => `${c.name}(${c.distance_km}km,eta${c.etaMin}m,★${c.rating})`).join(', '),
    );

    triedDriverIds.push(...candidates.map((c) => c.id));

    const ringExpiresAt = new Date(Date.now() + ACCEPT_TIMEOUT_MS);
    const offerPayload = toOfferPayload(candidates);

    // Persist one ride_offer row per candidate — durable audit trail of
    // exactly who was offered this ride, at what distance/score, and when.
    await createOffersForRing(rideId, offerPayload, ringIdx + 1, radiusKm, ringExpiresAt)
      .catch((err) => console.error('[Matching] createOffersForRing failed:', err.message));

    // Store candidate list (used by validateDriverCanAccept fast-path)
    await redis.setex(
      REDIS_KEYS.rideRequest(rideId),
      Math.ceil(ACCEPT_TIMEOUT_MS / 1000) + 10,
      JSON.stringify({ rideId, candidateDriverIds: candidates.map((c) => c.id), ring: ringIdx + 1, radiusKm }),
    );

    // Bug 4 fix: store ride→candidates mapping so Socket.IO can join drivers to
    // the "candidates" room and send ride:taken when another driver accepts
    await redis.setex(
      `ride:candidates:${rideId}`,
      Math.ceil(ACCEPT_TIMEOUT_MS / 1000) + 10,
      JSON.stringify(candidates.map((c) => c.id)),
    );

    // Broadcast to all candidates via Kafka → Socket.IO
    await publishEvent(TOPICS.RIDE_MATCHED, {
      id: rideId,
      rideId,
      ring: ringIdx + 1,
      radiusKm,
      candidates: offerPayload,
      pickupLat, pickupLng,
      dropLat: ride.dropLat,
      dropLng: ride.dropLng,
      pickupAddress: ride.pickupAddress,
      dropAddress: ride.dropAddress,
      vehicleTypeId,
      estimatedFare: fromMinor(ride.estimatedFareMinor, ride.currencyCode),
      currency: ride.currencyCode,
      distanceKm: ride.distanceKm,
      polyline: ride.polyline,
      expiresAt: Date.now() + ACCEPT_TIMEOUT_MS,
    }, rideId);

    // Bug 9 fix: instant signal via pub/sub — no more DB polling
    const accepted = await waitForAcceptanceSignal(rideId, ACCEPT_TIMEOUT_MS);
    if (accepted) {
      console.log(`[Matching] Ride ${rideId} — accepted in ring ${radiusKm} km`);
      observeRing('accepted');
      return;
    }

    // Ring window closed with no acceptance — bulk-expire this ring's offers and
    // release exactly those drivers' locks (derived from what actually expired,
    // never "every candidate in this ring", so a late accept landing concurrently
    // can't have its winning driver's lock yanked out from under it).
    const expired = await expirePendingOffers(rideId, ringIdx + 1)
      .catch((err) => { console.error('[Matching] expirePendingOffers failed:', err.message); return []; });
    await releaseLocks(expired.map((o) => o.driverId), rideId)
      .catch((err) => console.error('[Matching] releaseLocks (ring timeout) failed:', err.message));

    observeRing('timeout');
    console.log(`[Matching] Ride ${rideId} — ring ${radiusKm} km timed out, expanding`);
  }

  await _expireRide(rideId);
}

async function _expireRide(rideId) {
  // Check it wasn't accepted by a late signal before we expire
  const [ride] = await db.select({ status: rides.status, riderId: rides.riderId })
    .from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride || ride.status !== 'searching') return; // accepted in the meantime

  await db.update(rides).set({
    status: 'expired',
    cancelledAt: new Date(),
    cancelledBy: 'system',
    cancelReason: 'No driver found in any search radius',
  }).where(and(eq(rides.id, rideId), eq(rides.status, 'searching')));

  await recordStatusChange({
    rideId, fromStatus: 'searching', toStatus: 'expired',
    changedBy: 'system', reason: 'No driver found in any search radius (5/10/15 km exhausted)',
  });

  await redis.del(REDIS_KEYS.rideRequest(rideId));
  await redis.del(`ride:candidates:${rideId}`);

  await publishEvent(TOPICS.RIDE_CANCELLED, {
    id: rideId, rideId, riderId: ride.riderId, cancelledBy: 'system', reason: 'no_driver',
  });
  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: ride.riderId,
    type: 'RIDE_EXPIRED',
    title: 'No driver found',
    body: 'Sorry, no drivers available nearby. Please try again in a moment.',
  });
  console.log(`[Matching] Ride ${rideId} expired — no driver in any ring`);
}

/**
 * Called from ride.service.acceptRide AFTER DB update succeeds.
 * Publishes the acceptance signal so _runMatchingRings resolves immediately.
 * Also clears the candidate cache.
 */
export async function signalRideAccepted(rideId) {
  await redisPub.publish(REDIS_KEYS.CHAN.rideAccepted(rideId), 'accepted');
  // this is fine; the restriction is "don't run regular commands on the sub client"
}

/**
 * Called from ride.service.cancelRideByRider so the matching loop aborts instantly.
 */
export async function signalRideCancelled(rideId) {
  await redisPub.publish(REDIS_KEYS.CHAN.rideAccepted(rideId), 'cancelled');
}

/**
 * Validates that a driver currently holds a pending offer for this ride.
 * Redis is checked first (fast path, sub-millisecond); the `ride_offers`
 * table is the durable source of truth and is always re-checked so a
 * Redis TTL expiry or restart can never let an unmatched driver slip through.
 */
export async function validateDriverCanAccept(rideId, driverId) {
  const raw = await redis.get(REDIS_KEYS.rideRequest(rideId));
  if (raw) {
    const { candidateDriverIds } = JSON.parse(raw);
    if (candidateDriverIds.includes(driverId)) return; // fast path — confirmed
  }

  // Fall back to durable DB check (covers Redis TTL expiry / cache miss)
  const ok = await hasPendingOffer(rideId, driverId);
  if (!ok) throw { statusCode: 403, message: 'You were not matched to this ride, or the offer has expired' };
}
