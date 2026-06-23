import { sql, eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { drivers, subscriptions, rides } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

/**
 * Expanding radius search: 5 km → 10 km → 15 km.
 *
 * For each ring we query only active-subscription, approved,
 * online, unblocked drivers of the requested vehicleType.
 *
 * Drivers are scored by:
 *   score = (1 / distance_km) * 0.6   — proximity weight
 *         + (rating / 5)       * 0.4   — rating weight
 *
 * The top 5 drivers per ring are broadcast via Kafka.
 * If no driver accepts within ACCEPT_TIMEOUT_MS we expand.
 */

const RADII_KM = [5, 10, 15];
const ACCEPT_TIMEOUT_MS = 25_000;  // 25 s per ring
const MAX_CANDIDATES = 5;

// ── helpers ──────────────────────────────────────────────────────────────────

function scoreDrivers(rows) {
  return rows
    .map((d) => ({
      ...d,
      _score:
        (1 / Math.max(d.distance_km, 0.1)) * 0.6 +
        (parseFloat(d.rating) / 5) * 0.4,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, MAX_CANDIDATES);
}

/**
 * Haversine query — returns drivers within `radiusKm`
 * that have NOT been tried in a previous ring (excludedIds).
 */
async function queryDriversInRadius(pickupLat, pickupLng, vehicleTypeId, radiusKm, excludedIds) {
  const exclusion = excludedIds.length
    ? sql`AND d.id NOT IN (${sql.join(excludedIds.map((id) => sql`${id}`), sql`, `)})`
    : sql``;

  return db.execute(sql`
    SELECT
      d.id,
      d.name,
      d.phone,
      d.vehicle_number    AS "vehicleNumber",
      d.vehicle_model     AS "vehicleModel",
      d.rating,
      d.total_rides       AS "totalRides",
      d.profile_photo     AS "profilePhoto",
      d.fcm_token         AS "fcmToken",
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
      d.is_online          = true
      AND d.is_blocked     = false
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
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Start the expanding-radius search for a ride.
 * Called after a ride row is created (status = 'requested').
 *
 * Flow per ring:
 *   1. Query DB for candidates within ring radius.
 *   2. Score & pick top MAX_CANDIDATES.
 *   3. Publish RIDE_MATCHED event → Socket.IO notifies drivers.
 *   4. Store candidate list in Redis with short TTL.
 *   5. Wait ACCEPT_TIMEOUT_MS — if still unaccepted, try next ring.
 *   6. After all rings exhausted → mark ride 'expired', notify rider.
 *
 * This function returns immediately after kicking off the async process.
 */
export function startMatchingProcess(ride) {
  // Fire-and-forget — does not block the HTTP response
  _runMatchingRings(ride).catch((err) =>
    console.error(`[Matching] Error for ride ${ride.id}:`, err),
  );
}

async function _runMatchingRings(ride) {
  const { id: rideId, pickupLat, pickupLng, vehicleTypeId } = ride;
  const triedDriverIds = [];

  for (let ringIdx = 0; ringIdx < RADII_KM.length; ringIdx++) {
    const radiusKm = RADII_KM[ringIdx];

    // Check ride is still unaccepted before each ring
    const [current] = await db.select({ status: rides.status }).from(rides)
      .where(eq(rides.id, rideId)).limit(1);
    if (!current || current.status !== 'searching') {
      console.log(`[Matching] Ride ${rideId} no longer searching — aborting.`);
      return;
    }

    const rows = await queryDriversInRadius(
      parseFloat(pickupLat), parseFloat(pickupLng),
      vehicleTypeId, radiusKm, triedDriverIds,
    );

    const candidates = scoreDrivers(rows);

    if (candidates.length === 0) {
      console.log(`[Matching] Ride ${rideId} — no drivers in ring ${radiusKm}km, expanding...`);
      // Track tried IDs even if empty so we don't re-query the same set after expansion
      continue;
    }

    console.log(
      `[Matching] Ride ${rideId} — ring ${radiusKm}km, ${candidates.length} candidates: ` +
      candidates.map((c) => `${c.name}(${c.distance_km}km)`).join(', '),
    );

    // Add to tried list so next ring won't re-notify the same drivers
    triedDriverIds.push(...candidates.map((c) => c.id));

    // Store candidates in Redis so driver.accept can validate
    await redis.setex(
      REDIS_KEYS.rideRequest(rideId),
      Math.ceil(ACCEPT_TIMEOUT_MS / 1000) + 5,
      JSON.stringify({
        rideId,
        candidateDriverIds: candidates.map((c) => c.id),
        ring: ringIdx + 1,
        radiusKm,
      }),
    );

    // Publish to Kafka — consumers forward to Socket.IO per-driver room
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
      expiresAt: Date.now() + ACCEPT_TIMEOUT_MS,
    }, rideId);

    // Wait for acceptance or timeout
    const accepted = await _waitForAcceptance(rideId, ACCEPT_TIMEOUT_MS);
    if (accepted) return;

    console.log(`[Matching] Ride ${rideId} — ring ${radiusKm}km timed out.`);
  }

  // All rings exhausted — mark ride expired
  await _expireRide(rideId);
}

/**
 * Poll Redis every 2s to check if ride was accepted within the window.
 */
async function _waitForAcceptance(rideId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const [ride] = await db.select({ status: rides.status, driverId: rides.driverId })
      .from(rides).where(eq(rides.id, rideId)).limit(1);
    if (ride?.status === 'accepted' || ride?.driverId) return true;
    if (ride?.status === 'cancelled') return true; // rider cancelled
    await _sleep(2000);
  }
  return false;
}

async function _expireRide(rideId) {
  await db.update(rides)
    .set({ status: 'expired', cancelledAt: new Date(), cancelledBy: 'system', cancelReason: 'No driver found' })
    .where(eq(rides.id, rideId));
  await redis.del(REDIS_KEYS.rideRequest(rideId));
  await publishEvent(TOPICS.RIDE_CANCELLED, { id: rideId, rideId, reason: 'no_driver', cancelledBy: 'system' });
  await publishEvent(TOPICS.NOTIF_PUSH, {
    rideId,
    userType: 'rider',
    type: 'RIDE_EXPIRED',
    title: 'No driver found',
    body: 'Sorry, no drivers are available right now. Please try again.',
  });
  console.log(`[Matching] Ride ${rideId} expired — no driver in any ring.`);
}

function _sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Validate that a driver is allowed to accept a specific ride.
 * Called from ride.service before updating DB.
 */
export async function validateDriverCanAccept(rideId, driverId) {
  const raw = await redis.get(REDIS_KEYS.rideRequest(rideId));
  if (!raw) throw { statusCode: 410, message: 'Ride request has expired' };
  const { candidateDriverIds } = JSON.parse(raw);
  if (!candidateDriverIds.includes(driverId)) {
    throw { statusCode: 403, message: 'You were not matched to this ride' };
  }
}
