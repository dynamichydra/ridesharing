import { db } from '../../config/db.js';
import { redis, redisSub, REDIS_KEYS } from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { fromMinor } from '../../utils/money.js';
import { acquireLock, releaseLocks } from './driver-lock.service.js';
import { createOffersForRing, expirePendingOffers } from '../ride/ride_offer.service.js';
import { setDriverCooldown } from './candidate-filter.service.js';

/**
 * Dispatch Wave Service
 *
 * Implements wave-based dispatching with distributed locking,
 * TTL management, candidate cooldowns, and non-polling Redis Pub/Sub resolution.
 */

/**
 * Maps candidates to offer broadcast payload.
 */
export function toOfferPayload(candidates) {
  return candidates.map((c, idx) => ({
    driverId: c.id,
    name: c.name,
    rating: c.rating,
    distanceKm: c.distance_km || c.distanceKm,
    etaMin: c.etaMin,
    etaSeconds: c.etaSeconds,
    vehicleNumber: c.vehicleNumber,
    vehicleModel: c.vehicleModel,
    fcmToken: c.fcmToken,
    rank: idx + 1,
    score: c._score,
    scoreBreakdown: c.scoreBreakdown || {},
  }));
}

/**
 * Locks candidate drivers for a wave using Redis distributed locks.
 */
export async function lockWaveCandidates(candidates, rideId, lockTtlMs) {
  const locked = [];
  for (const candidate of candidates) {
    const success = await acquireLock(candidate.id, rideId, lockTtlMs);
    if (success) {
      locked.push(candidate);
    }
  }
  return locked;
}

/**
 * Waits for a Redis Pub/Sub signal on ride acceptance or cancellation.
 */
export function waitForAcceptanceSignal(rideId, timeoutMs) {
  return new Promise((resolve) => {
    const channel = REDIS_KEYS.CHAN.rideAccepted(rideId);
    let settled = false;

    const cleanup = () => {
      redisSub.removeListener('message', onMessage);
      redisSub.unsubscribe(channel).catch(() => {});
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    }, timeoutMs);

    function onMessage(ch, msg) {
      if (ch !== channel || settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      // msg = "accepted" | "cancelled"
      resolve(true);
    }

    redisSub.on('message', onMessage);

    redisSub.subscribe(channel, (err) => {
      if (err) {
        console.error('[DispatchWave] redisSub error:', err.message);
      }
    });
  });
}

/**
 * Executes a single dispatch wave.
 *
 * @param {Object} ride
 * @param {Array<Object>} candidates Scored candidate drivers for this wave
 * @param {Object} waveParams { waveNumber, ringNumber, radiusKm, timeoutSec, dispatchJobId }
 * @returns {Promise<{ accepted: boolean, offeredCount: number, offeredDriverIds: Array<string> }>}
 */
export async function executeDispatchWave(ride, candidates, waveParams) {
  const { waveNumber, ringNumber, radiusKm, timeoutSec = 15, dispatchJobId = null } = waveParams;
  const timeoutMs = timeoutSec * 1000;
  const lockTtlMs = timeoutMs + 5000; // 5s safety buffer

  // 1. Acquire distributed locks for candidates in rank order
  const lockedCandidates = await lockWaveCandidates(candidates, ride.id, lockTtlMs);

  if (lockedCandidates.length === 0) {
    return { accepted: false, offeredCount: 0, offeredDriverIds: [] };
  }

  const offerPayload = toOfferPayload(lockedCandidates);
  const offeredDriverIds = lockedCandidates.map((c) => c.id);
  const expiresAt = new Date(Date.now() + timeoutMs);

  // 2. Persist offers in database
  try {
    await createOffersForRing(ride.id, offerPayload, ringNumber || waveNumber, radiusKm, expiresAt);
  } catch (err) {
    console.error('[DispatchWave] createOffersForRing failed:', err.message);
  }

  // 3. Store fast-path candidate lookup in Redis
  await redis.setex(
    REDIS_KEYS.rideRequest(ride.id),
    Math.ceil(timeoutMs / 1000) + 10,
    JSON.stringify({
      rideId: ride.id,
      candidateDriverIds: offeredDriverIds,
      wave: waveNumber,
      ring: ringNumber,
      radiusKm,
    })
  );

  await redis.setex(
    `ride:candidates:${ride.id}`,
    Math.ceil(timeoutMs / 1000) + 10,
    JSON.stringify(offeredDriverIds)
  );

  // 4. Broadcast RIDE_MATCHED via Kafka -> Sockets
  try {
    const grossFareMinor = ride.fareSnapshot?.originalEstimatedFareMinor
    const promoDiscountMinor = ride.fareSnapshot?.discountAmountMinor
      || ride.fareSnapshot?.breakdown?.promo?.discountAmountMinor
      || 0;
    const riderEstimatedFareMinor = ride.estimatedFareMinor || (grossFareMinor - promoDiscountMinor);

    await publishEvent(
      TOPICS.RIDE_MATCHED,
      {
        id: ride.id,
        rideId: ride.id,
        dispatchJobId,
        wave: waveNumber,
        ring: ringNumber,
        radiusKm,
        candidates: offerPayload,
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
        dropLat: ride.dropLat,
        dropLng: ride.dropLng,
        pickupAddress: ride.pickupAddress,
        dropAddress: ride.dropAddress,
        vehicleTypeId: ride.vehicleTypeId,
        estimatedFare: fromMinor(grossFareMinor, ride.currencyCode),
        grossEstimatedFare: fromMinor(grossFareMinor, ride.currencyCode),
        grossEstimatedFareMinor: grossFareMinor,
        riderEstimatedFare: fromMinor(riderEstimatedFareMinor, ride.currencyCode),
        riderEstimatedFareMinor,
        promoIncentive: fromMinor(promoDiscountMinor, ride.currencyCode),
        promoIncentiveMinor: promoDiscountMinor,
        hasPromo: promoDiscountMinor > 0,
        currency: ride.currencyCode,
        distanceKm: ride.distanceKm,
        polyline: ride.polyline,
        paymentMethod: ride.paymentMethod || 'cash',
        expiresAt: Date.now() + timeoutMs,
      },
      ride.id
    );
  } catch (err) {
    console.error('[DispatchWave] publishEvent(RIDE_MATCHED) error:', err.message);
  }

  // 5. Wait for pub/sub acceptance signal
  const accepted = await waitForAcceptanceSignal(ride.id, timeoutMs);

  if (accepted) {
    return { accepted: true, offeredCount: lockedCandidates.length, offeredDriverIds };
  }

  // 6. Timeout: Expire offers, release locks, and apply cooldowns
  const expired = await expirePendingOffers(ride.id, ringNumber || waveNumber).catch(() => []);
  const expiredDriverIds = expired.length > 0 ? expired.map((o) => o.driverId) : offeredDriverIds;

  await releaseLocks(expiredDriverIds, ride.id).catch((err) =>
    console.error('[DispatchWave] releaseLocks error:', err.message)
  );

  // Set cooldown so we don't immediately re-offer in the next wave of this same ride
  await Promise.all(
    expiredDriverIds.map((driverId) => setDriverCooldown(ride.id, driverId, 60))
  );

  return { accepted: false, offeredCount: lockedCandidates.length, offeredDriverIds };
}
