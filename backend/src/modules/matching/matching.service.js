/**
 * Expanding-radius driver matching engine.
 *
 * Ring progression:  5 km → 10 km → 15 km
 * Per ring:
 *   1. Query online, approved, subscribed drivers within radius (Haversine SQL).
 *   2. Exclude drivers already notified in previous rings.
 *   3. Score top-5 by proximity (60%) + rating (40%).
 *   4. Store candidate list in Redis.
 *   5. Emit ride:new_request to each candidate's socket room via Kafka.
 *   6. Subscribe to Redis pub/sub acceptance channel — instant signal, no DB polling.
 *   7. If timeout expires → expand to next ring.
 *   8. All rings exhausted → expire ride.
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
import {
  createOffersForRing,
  expirePendingOffers,
  hasPendingOffer
} from '../ride/ride_offer.service.js';
import { recordStatusChange } from '../ride/ride_status_history.service.js';

const RADII_KM = [5, 10, 15];
const ACCEPT_TIMEOUT_MS = 25_000;   // 25 s per ring
const MAX_CANDIDATES = 5;

// ── scoring ───────────────────────────────────────────────────────────────────

function scoreDrivers(rows) {
  return rows
    .map((d) => ({
      ...d,
      _score:
        (1 / Math.max(parseFloat(d.distance_km), 0.1)) * 0.6 +
        (parseFloat(d.rating) / 5) * 0.4,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, MAX_CANDIDATES);
}

// ── DB query ──────────────────────────────────────────────────────────────────

async function queryDriversInRadius(pickupLat, pickupLng, vehicleTypeId, radiusKm, excludedIds) {
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
    WHERE
      d.is_online           = true
      AND d.is_blocked      = false
      AND d.approval_status = 'approved'
      AND d.vehicle_type_id = ${vehicleTypeId}
      AND d.current_lat IS NOT NULL
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
    LIMIT 20
  `);
  return rows;
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

// ── public API ────────────────────────────────────────────────────────────────

export function startMatchingProcess(ride) {
  _runMatchingRings(ride).catch((err) =>
    console.error(`[Matching] Unhandled error for ride ${ride.id}:`, err),
  );
}

async function _runMatchingRings(ride) {
  const { id: rideId, pickupLat, pickupLng, vehicleTypeId } = ride;
  const triedDriverIds = [];

  for (let ringIdx = 0; ringIdx < RADII_KM.length; ringIdx++) {
    const radiusKm = RADII_KM[ringIdx];

    // Abort early if ride status changed before we start this ring
    const [current] = await db.select({ status: rides.status }).from(rides)
      .where(eq(rides.id, rideId)).limit(1);
    if (!current || current.status !== 'searching') {
      console.log(`[Matching] Ride ${rideId} no longer searching — aborting rings`);
      return;
    }

    const rows = await queryDriversInRadius(
      parseFloat(pickupLat), parseFloat(pickupLng),
      vehicleTypeId, radiusKm, triedDriverIds,
    );
    const candidates = scoreDrivers(rows);

    if (candidates.length === 0) {
      console.log(`[Matching] Ride ${rideId} — ring ${radiusKm} km: no candidates, expanding`);
      continue;
    }

    console.log(
      `[Matching] Ride ${rideId} — ring ${radiusKm} km: ` +
      candidates.map((c) => `${c.name}(${c.distance_km}km,★${c.rating})`).join(', '),
    );

    triedDriverIds.push(...candidates.map((c) => c.id));

    const ringExpiresAt = new Date(Date.now() + ACCEPT_TIMEOUT_MS);

    // Persist one ride_offer row per candidate — durable audit trail of
    // exactly who was offered this ride, at what distance/score, and when.
    await createOffersForRing(rideId, candidates, ringIdx + 1, radiusKm, ringExpiresAt)
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
      candidates: candidates.map((c) => ({
        driverId: c.id,
        name: c.name,
        rating: c.rating,
        distanceKm: c.distance_km,
        vehicleNumber: c.vehicleNumber,
        fcmToken: c.fcmToken,
      })),
      pickupLat, pickupLng,
      dropLat: ride.dropLat,
      dropLng: ride.dropLng,
      pickupAddress: ride.pickupAddress,
      dropAddress: ride.dropAddress,
      vehicleTypeId,
      estimatedFare: ride.estimatedFare,
      distanceKm: ride.distanceKm,
      polyline: ride.polyline,
      expiresAt: Date.now() + ACCEPT_TIMEOUT_MS,
    }, rideId);

    // Bug 9 fix: instant signal via pub/sub — no more DB polling
    const accepted = await waitForAcceptanceSignal(rideId, ACCEPT_TIMEOUT_MS);
    if (accepted) {
      console.log(`[Matching] Ride ${rideId} — accepted in ring ${radiusKm} km`);
      return;
    }

    // Ring window closed with no acceptance — bulk-expire this ring's offers
    await expirePendingOffers(rideId, ringIdx + 1)
      .catch((err) => console.error('[Matching] expirePendingOffers failed:', err.message));

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