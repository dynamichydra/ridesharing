import { eq, desc, count, and, or, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { rides, drivers, users } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { calculateFare } from '../fare/fare.service.js';
import {
  startMatchingProcess,
  validateDriverCanAccept
} from '../matching/matching.service.js';
import {
  computeApproachRoute,
  updateApproachProgress,
  initTripTracking,
  updateTripProgress,
  cleanupRideTracking
} from '../tracking/tracking.service.js';
import {
  acceptOffer, rejectOffer,
  getOffersForRide,
  getDriverOffers
} from './ride_offer.service.js';
import {
  recordStatusChange,
  getRideHistory
} from './ride_status_history.service.js';
import { paginate } from '../../utils/response.js';
import { fromMinor, formatMoney } from '../../utils/money.js';

// ── Rider actions ──────────────────────────────────────────────────────────────

export async function requestRide({
  riderId, vehicleTypeId,
  pickupLat, pickupLng, pickupAddress,
  dropLat, dropLng, dropAddress,
}) {
  // Guard: rider cannot have two active rides
  const [active] = await db.select({ id: rides.id }).from(rides).where(and(
    eq(rides.riderId, riderId),
    or(
      eq(rides.status, 'searching'),
      eq(rides.status, 'accepted'),
      eq(rides.status, 'arriving'),
      eq(rides.status, 'started'),
    ),
  )).limit(1);
  if (active) throw { statusCode: 409, message: 'You already have an active ride' };

  // Fare snapshot
  const fareData = await calculateFare({
    pickupLat: parseFloat(pickupLat), pickupLng: parseFloat(pickupLng),
    dropLat: parseFloat(dropLat), dropLng: parseFloat(dropLng),
    vehicleTypeId,
  });

  const [ride] = await db.insert(rides).values({
    riderId, vehicleTypeId,
    countryId: fareData.countryId,
    currencyCode: fareData.currencyCode,
    pickupLat: String(pickupLat), pickupLng: String(pickupLng), pickupAddress,
    dropLat: String(dropLat), dropLng: String(dropLng), dropAddress,
    estimatedFareMinor: fareData.estimatedFareMinor,
    distanceKm: String(fareData.distanceKm),
    durationMin: fareData.durationInTrafficMin,
    polyline: fareData.polyline,
    fareSnapshot: fareData,
    status: 'searching',
  }).returning();

  // Anchors the very start of this ride's status_history timeline.
  // Every subsequent transition (accepted/started/completed/cancelled/expired)
  // is recorded at its respective call site below and in matching.service.js.
  await recordStatusChange({
    rideId: ride.id, fromStatus: null, toStatus: 'searching',
    changedBy: 'rider', changedById: riderId,
    reason: 'Ride requested by rider',
  });

  await publishEvent(TOPICS.RIDE_REQUESTED, { id: ride.id, ...ride });

  // Non-blocking — kicks off 5→10→15 km ring search
  startMatchingProcess(ride);

  return { ride, fareEstimate: fareData };
}

export async function cancelRideByRider(rideId, riderId, reason) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.riderId !== riderId) throw { statusCode: 403, message: 'Not your ride' };

  const cancellable = ['searching', 'accepted', 'arriving'];
  if (!cancellable.includes(ride.status)) {
    throw { statusCode: 409, message: `Cannot cancel a ride in status: ${ride.status}` };
  }

  const [updated] = await db.update(rides).set({
    status: 'cancelled',
    cancelledBy: 'rider',
    cancelReason: reason || 'Cancelled by rider',
    cancelledAt: new Date(),
  }).where(eq(rides.id, rideId)).returning();

  await recordStatusChange({
    rideId, fromStatus: ride.status, toStatus: 'cancelled',
    changedBy: 'rider', changedById: riderId, reason: reason || 'Cancelled by rider',
  });

  await redis.del(REDIS_KEYS.rideRequest(rideId));
  await cleanupRideTracking(rideId);

  if (ride.driverId) {
    await db.update(drivers).set({ isOnline: true }).where(eq(drivers.id, ride.driverId));
    // Bug 2 fix: driverRideActive now stores JSON, not bare string
    await redis.del(REDIS_KEYS.driverRideActive(ride.driverId));
    await publishEvent(TOPICS.NOTIF_PUSH, {
      userType: 'driver', userId: ride.driverId,
      type: 'RIDE_CANCELLED_BY_RIDER',
      title: 'Ride Cancelled',
      body: `Rider cancelled. Reason: ${reason || 'Not specified'}`,
    });
  }

  await publishEvent(TOPICS.RIDE_CANCELLED, {
    id: rideId, rideId, riderId: ride.riderId, driverId: ride.driverId,
    cancelledBy: 'rider', reason,
  });
  return updated;
}

export async function rateDriver(rideId, riderId, rating, review) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.riderId !== riderId) throw { statusCode: 403, message: 'Not your ride' };
  if (ride.status !== 'completed') throw { statusCode: 409, message: 'Can only rate completed rides' };
  if (ride.driverRating) throw { statusCode: 409, message: 'Already rated' };

  await db.update(rides).set({ driverRating: rating, driverReview: review }).where(eq(rides.id, rideId));

  if (ride.driverId) {
    const [driver] = await db.select({ rating: drivers.rating, totalRatings: drivers.totalRatings })
      .from(drivers).where(eq(drivers.id, ride.driverId)).limit(1);
    const newCount = (driver.totalRatings || 0) + 1;
    const newRating = ((parseFloat(driver.rating) * (newCount - 1)) + rating) / newCount;
    await db.update(drivers).set({
      rating: String(newRating.toFixed(2)),
      totalRatings: newCount,
    }).where(eq(drivers.id, ride.driverId));
  }
  return { rated: true };
}

// ── Driver actions ─────────────────────────────────────────────────────────────

export async function acceptRide(rideId, driverId) {
  await validateDriverCanAccept(rideId, driverId);

  const [ride] = await db.select().from(rides).where(
    and(eq(rides.id, rideId), eq(rides.status, 'searching')),
  ).limit(1);
  if (!ride) throw { statusCode: 409, message: 'Ride is no longer available' };

  // Bug 2 fix: check driverRideActive as JSON
  const activeRaw = await redis.get(REDIS_KEYS.driverRideActive(driverId));
  if (activeRaw) throw { statusCode: 409, message: 'You already have an active ride' };

  // Close this driver's ride_offer row (accepted) and supersede every other
  // pending offer for this ride in one atomic step. If this returns null it
  // means another driver's accept won the race on the offers table — bail out
  // before touching the rides row so we never end up with a mismatched state.
  const offer = await acceptOffer(rideId, driverId);
  if (!offer) throw { statusCode: 409, message: 'This ride offer is no longer available' };

  // Atomic update — prevents two drivers accepting simultaneously
  const [updated] = await db.update(rides).set({
    driverId, status: 'accepted', acceptedAt: new Date(),
  }).where(and(eq(rides.id, rideId), eq(rides.status, 'searching'))).returning();
  if (!updated) throw { statusCode: 409, message: 'Ride was just accepted by another driver' };

  await recordStatusChange({
    rideId, fromStatus: 'searching', toStatus: 'accepted',
    changedBy: 'driver', changedById: driverId,
    meta: { ring: offer.ring, distanceKm: offer.distanceKm, offerId: offer.id },
  });

  // Bug 2 fix: store {rideId, riderId} JSON so location consumer can route without DB
  await redis.setex(
    REDIS_KEYS.driverRideActive(driverId),
    7200,
    JSON.stringify({ rideId, riderId: ride.riderId }),
  );
  await redis.del(REDIS_KEYS.rideRequest(rideId));

  // Driver details for rider notification
  const [driver] = await db.select({
    id: drivers.id,
    name: drivers.name,
    phone: drivers.phone,
    vehicleNumber: drivers.vehicleNumber,
    vehicleModel: drivers.vehicleModel,
    rating: drivers.rating,
    profilePhoto: drivers.profilePhoto,
    currentLat: drivers.currentLat,
    currentLng: drivers.currentLng,
  }).from(drivers).where(eq(drivers.id, driverId)).limit(1);

  // Bug 11 fix: compute approach route (driver → pickup) immediately after accept
  // Fire-and-forget — don't block the response
  computeApproachRoute(updated, driver).catch((err) =>
    console.error('[Ride] computeApproachRoute failed:', err.message),
  );

  await publishEvent(TOPICS.RIDE_ACCEPTED, {
    id: rideId, rideId, driverId, driver,
    riderId: ride.riderId,
  });
  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: ride.riderId,
    type: 'RIDE_ACCEPTED',
    title: 'Driver Found!',
    body: `${driver.name} is on the way — ${driver.vehicleModel} ${driver.vehicleNumber}`,
  });

  return updated;
}

export async function markArriving(rideId, driverId) {
  const [updated] = await db.update(rides).set({ status: 'arriving' }).where(
    and(eq(rides.id, rideId), eq(rides.driverId, driverId), eq(rides.status, 'accepted')),
  ).returning();
  if (!updated) throw { statusCode: 404, message: 'Ride not found or invalid status' };

  await recordStatusChange({
    rideId, fromStatus: 'accepted', toStatus: 'arriving',
    changedBy: 'driver', changedById: driverId,
  });

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: updated.riderId,
    type: 'DRIVER_ARRIVING',
    title: 'Driver has arrived!',
    body: 'Your driver is at the pickup point.',
  });
  return updated;
}

export async function startRide(rideId, driverId) {
  const [ride] = await db.select().from(rides).where(
    and(eq(rides.id, rideId), eq(rides.driverId, driverId)),
  ).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.status !== 'accepted' && ride.status !== 'arriving') {
    throw { statusCode: 409, message: `Cannot start ride in status: ${ride.status}` };
  }

  const [updated] = await db.update(rides).set({
    status: 'started', startedAt: new Date(),
  }).where(eq(rides.id, rideId)).returning();

  await recordStatusChange({
    rideId, fromStatus: ride.status, toStatus: 'started',
    changedBy: 'driver', changedById: driverId,
  });

  // Bug 7 / Gap 4 fix: initialise trip tracking (decode polyline, store progress context)
  initTripTracking(updated).catch((err) =>
    console.error('[Ride] initTripTracking failed:', err.message),
  );

  await publishEvent(TOPICS.RIDE_STARTED, { id: rideId, rideId, driverId, riderId: ride.riderId });
  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: ride.riderId,
    type: 'RIDE_STARTED',
    title: 'Your ride has started',
    body: 'Enjoy your trip!',
  });
  return updated;
}

export async function completeRide(rideId, driverId) {
  const [ride] = await db.select().from(rides).where(
    and(eq(rides.id, rideId), eq(rides.driverId, driverId)),
  ).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.status !== 'started') throw { statusCode: 409, message: 'Ride has not started yet' };

  // Bug 10 fix: recalculate final fare using actual trip duration
  const actualDurationMin = ride.startedAt
    ? Math.ceil((Date.now() - new Date(ride.startedAt).getTime()) / 60_000)
    : ride.durationMin;

  const snapshot = ride.fareSnapshot || {};
  const baseFareMinor = snapshot.breakdown?.baseFareMinor ?? Math.round(ride.estimatedFareMinor * 0.2);
  const distanceFareMinor = snapshot.breakdown?.distanceFareMinor ?? Math.round(ride.estimatedFareMinor * 0.6);
  const perMinRateMinor = snapshot.breakdown?.timeFareMinor
    ? snapshot.breakdown.timeFareMinor / Math.max(ride.durationMin, 1)
    : 0;
  const actualTimeFareMinor = perMinRateMinor * actualDurationMin;
  const zoneMultiplier = snapshot.breakdown?.zoneMultiplier ?? 1;
  const surgeMultiplier = snapshot.breakdown?.surgeMultiplier ?? 1;
  const minFareMinor = snapshot.breakdown?.minFareMinor ?? 0;
  const rawFinalFareMinor = (baseFareMinor + distanceFareMinor + actualTimeFareMinor) * zoneMultiplier * surgeMultiplier;
  const finalFareMinor = Math.ceil(Math.max(rawFinalFareMinor, minFareMinor));

  const [updated] = await db.update(rides).set({
    status: 'completed',
    finalFareMinor,
    durationMin: actualDurationMin,
    completedAt: new Date(),
  }).where(eq(rides.id, rideId)).returning();

  await recordStatusChange({
    rideId, fromStatus: 'started', toStatus: 'completed',
    changedBy: 'driver', changedById: driverId,
    meta: { finalFareMinor, actualDurationMin },
  });

  // Release driver
  await redis.del(REDIS_KEYS.driverRideActive(driverId));
  await cleanupRideTracking(rideId);
  await db.update(drivers).set({ totalRides: sql`total_rides + 1` })
    .where(eq(drivers.id, driverId));

  await publishEvent(TOPICS.RIDE_COMPLETED, {
    id: rideId, rideId, driverId, riderId: ride.riderId,
    finalFare: fromMinor(finalFareMinor, ride.currencyCode), currency: ride.currencyCode,
  });
  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: ride.riderId,
    type: 'RIDE_COMPLETED',
    title: 'Ride Completed',
    body: `Your ride is complete. Total fare: ${formatMoney(finalFareMinor, ride.currencyCode)}`,
  });
  return updated;
}

export async function cancelRideByDriver(rideId, driverId, reason) {
  const [ride] = await db.select().from(rides).where(
    and(eq(rides.id, rideId), eq(rides.driverId, driverId)),
  ).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (['started', 'completed'].includes(ride.status)) {
    throw { statusCode: 409, message: 'Cannot cancel a started or completed ride' };
  }

  await db.update(rides).set({
    status: 'searching', driverId: null,
    cancelledBy: null, cancelReason: null, acceptedAt: null,
  }).where(eq(rides.id, rideId));

  await recordStatusChange({
    rideId, fromStatus: ride.status, toStatus: 'searching',
    changedBy: 'driver', changedById: driverId,
    reason: reason || 'Driver cancelled after accepting', meta: { previousDriverId: driverId },
  });

  await redis.del(REDIS_KEYS.driverRideActive(driverId));
  await cleanupRideTracking(rideId);

  // Re-trigger matching from scratch (new ring sweep)
  const [freshRide] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  startMatchingProcess(freshRide);

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: ride.riderId,
    type: 'DRIVER_CANCELLED',
    title: 'Driver cancelled',
    body: 'Finding another driver for you...',
  });
  return { rematching: true };
}

/**
 * Called by Socket.IO location_update handler.
 * Routes to the correct tracking phase based on current ride status.
 */
export async function handleDriverLocationUpdate(driverId, lat, lng) {
  // Bug 2 fix: driverRideActive stores {rideId, riderId} JSON
  const raw = await redis.get(REDIS_KEYS.driverRideActive(driverId));
  if (!raw) return; // driver not on a ride — skip

  const { rideId, riderId } = JSON.parse(raw);

  // Get current ride status (cache in Redis to avoid DB hit every 4s)
  const statusKey = `ride:status:${rideId}`;
  let status = await redis.get(statusKey);
  if (!status) {
    const [ride] = await db.select({ status: rides.status }).from(rides)
      .where(eq(rides.id, rideId)).limit(1);
    status = ride?.status;
    if (status) await redis.setex(statusKey, 10, status); // cache 10s
  }

  if (status === 'accepted' || status === 'arriving') {
    await updateApproachProgress(rideId, riderId, driverId, lat, lng);
  } else if (status === 'started') {
    await updateTripProgress(rideId, riderId, driverId, lat, lng);
  }
  // If status is searching/completed/cancelled — no-op
}

/**
 * Driver explicitly declines a ride offer (optional UX "Decline" button).
 * Does not affect ride status — matching engine simply won't wait on this
 * driver any further; the ring timeout / next ring continues normally.
 */
export async function declineOffer(rideId, driverId, reason) {
  const offer = await rejectOffer(rideId, driverId, reason);
  if (!offer) throw { statusCode: 404, message: 'No pending offer found for this ride' };
  return offer;
}

/**
 * Full broadcast history for a ride — every driver offered, every ring,
 * every outcome. Used by admin/support and by the requesting rider's app
 * to show "Searching... offered to 6 drivers so far".
 */
export async function getRideOffers(rideId) {
  return getOffersForRide(rideId);
}

/**
 * A driver's own paginated offer history (their ride-request inbox).
 */
export async function getMyOffers(driverId, page, limit, offset, status) {
  return getDriverOffers(driverId, page, limit, offset, status);
}

/**
 * Full status timeline for a ride — exposed to rider/driver/admin so the
 * app can render "Requested → Searching → Accepted → Started → Completed"
 * with timestamps, independent of the ride row's current (mutable) status.
 */
export async function getRideStatusTimeline(rideId) {
  return getRideHistory(rideId);
}

export async function getDriverActiveRide(driverId) {
  // Bug 2 fix: parse JSON
  const raw = await redis.get(REDIS_KEYS.driverRideActive(driverId));
  if (!raw) return null;
  const { rideId } = JSON.parse(raw);
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  return ride || null;
}

export async function getRideById(rideId) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  return ride;
}

export async function listAllRides(filters, page, limit, offset) {
  const conditions = [];
  if (filters.status) conditions.push(eq(rides.status, filters.status));
  if (filters.driverId) conditions.push(eq(rides.driverId, filters.driverId));
  if (filters.riderId) conditions.push(eq(rides.riderId, filters.riderId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(rides).where(where);
  const rows = await db.select().from(rides).where(where)
    .orderBy(desc(rides.requestedAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}