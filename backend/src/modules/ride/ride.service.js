import { eq, desc, count, and, or } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { rides, drivers, users } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { calculateFare } from '../fare/fare.service.js';
import { startMatchingProcess, validateDriverCanAccept } from '../matching/matching.service.js';
import { paginate } from '../../utils/response.js';

// ── Rider actions ─────────────────────────────────────────────────────────────

export async function requestRide({ riderId, vehicleTypeId, pickupLat, pickupLng, pickupAddress, dropLat, dropLng, dropAddress }) {
  // Block if rider already has an active ride
  const [active] = await db.select({ id: rides.id }).from(rides).where(
    and(
      eq(rides.riderId, riderId),
      or(
        eq(rides.status, 'requested'),
        eq(rides.status, 'searching'),
        eq(rides.status, 'accepted'),
        eq(rides.status, 'arriving'),
        eq(rides.status, 'started'),
      ),
    ),
  ).limit(1);
  if (active) throw { statusCode: 409, message: 'You already have an active ride' };

  // Calculate fare snapshot
  const fareData = await calculateFare({
    pickupLat: parseFloat(pickupLat), pickupLng: parseFloat(pickupLng),
    dropLat: parseFloat(dropLat), dropLng: parseFloat(dropLng),
    vehicleTypeId,
  });

  // Create ride record
  const [ride] = await db.insert(rides).values({
    riderId, vehicleTypeId,
    pickupLat: String(pickupLat), pickupLng: String(pickupLng), pickupAddress,
    dropLat: String(dropLat), dropLng: String(dropLng), dropAddress,
    estimatedFare: String(fareData.estimatedFare),
    distanceKm: String(fareData.distanceKm),
    durationMin: fareData.durationInTrafficMin,
    polyline: fareData.polyline,
    fareSnapshot: fareData,
    status: 'searching',
  }).returning();

  // Publish ride requested event
  await publishEvent(TOPICS.RIDE_REQUESTED, { id: ride.id, ...ride });

  // Kick off async expanding-radius matching (non-blocking)
  startMatchingProcess(ride);

  return { ride, fareEstimate: fareData };
}

export async function cancelRideByRider(rideId, riderId, reason) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.riderId !== riderId) throw { statusCode: 403, message: 'Not your ride' };
  const cancellable = ['requested', 'searching', 'accepted', 'arriving'];
  if (!cancellable.includes(ride.status)) {
    throw { statusCode: 409, message: `Cannot cancel a ride with status: ${ride.status}` };
  }

  const [updated] = await db.update(rides).set({
    status: 'cancelled',
    cancelledBy: 'rider',
    cancelReason: reason || 'Cancelled by rider',
    cancelledAt: new Date(),
  }).where(eq(rides.id, rideId)).returning();

  await redis.del(REDIS_KEYS.rideRequest(rideId));

  if (ride.driverId) {
    await db.update(drivers).set({ isOnline: true }).where(eq(drivers.id, ride.driverId));
    await redis.del(REDIS_KEYS.driverRideActive(ride.driverId));
    await publishEvent(TOPICS.NOTIF_PUSH, {
      userType: 'driver', userId: ride.driverId,
      type: 'RIDE_CANCELLED_BY_RIDER',
      title: 'Ride Cancelled', body: `Rider cancelled the ride. Reason: ${reason || 'Not specified'}`,
    });
  }

  await publishEvent(TOPICS.RIDE_CANCELLED, { id: rideId, rideId, cancelledBy: 'rider', reason });
  return updated;
}

export async function trackRide(rideId, riderId) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.riderId !== riderId) throw { statusCode: 403, message: 'Not your ride' };

  let driverLocation = null;
  if (ride.driverId) {
    const raw = await redis.get(REDIS_KEYS.driverLocation(ride.driverId));
    driverLocation = raw ? JSON.parse(raw) : null;
  }
  return { ride, driverLocation };
}

export async function rateDriver(rideId, riderId, rating, review) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.riderId !== riderId) throw { statusCode: 403, message: 'Not your ride' };
  if (ride.status !== 'completed') throw { statusCode: 409, message: 'Can only rate completed rides' };
  if (ride.driverRating) throw { statusCode: 409, message: 'Already rated' };

  await db.update(rides).set({ driverRating: rating, driverReview: review }).where(eq(rides.id, rideId));

  // Update driver's aggregate rating
  if (ride.driverId) {
    const [driver] = await db.select({ rating: drivers.rating, totalRatings: drivers.totalRatings })
      .from(drivers).where(eq(drivers.id, ride.driverId)).limit(1);
    const newCount = (driver.totalRatings || 0) + 1;
    const newRating = ((parseFloat(driver.rating) * (newCount - 1)) + rating) / newCount;
    await db.update(drivers).set({
      rating: String(newRating.toFixed(2)), totalRatings: newCount,
    }).where(eq(drivers.id, ride.driverId));
  }
  return { rated: true };
}

// ── Driver actions ────────────────────────────────────────────────────────────

export async function acceptRide(rideId, driverId) {
  // Validate driver is in candidate list
  await validateDriverCanAccept(rideId, driverId);

  // Atomic status check + update
  const [ride] = await db.select().from(rides).where(
    and(eq(rides.id, rideId), eq(rides.status, 'searching')),
  ).limit(1);
  if (!ride) throw { statusCode: 409, message: 'Ride is no longer available' };

  // Check driver doesn't already have an active ride
  const driverBusy = await redis.get(REDIS_KEYS.driverRideActive(driverId));
  if (driverBusy) throw { statusCode: 409, message: 'You already have an active ride' };

  const [updated] = await db.update(rides).set({
    driverId, status: 'accepted', acceptedAt: new Date(),
  }).where(and(eq(rides.id, rideId), eq(rides.status, 'searching'))).returning();
  if (!updated) throw { statusCode: 409, message: 'Ride was accepted by another driver' };

  // Lock driver to this ride
  await redis.setex(REDIS_KEYS.driverRideActive(driverId), 7200, rideId);
  // Clean up Redis candidate key
  await redis.del(REDIS_KEYS.rideRequest(rideId));

  // Get driver details for rider notification
  const [driver] = await db.select({
    id: drivers.id, name: drivers.name, phone: drivers.phone,
    vehicleNumber: drivers.vehicleNumber, vehicleModel: drivers.vehicleModel,
    rating: drivers.rating, profilePhoto: drivers.profilePhoto,
  }).from(drivers).where(eq(drivers.id, driverId)).limit(1);

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

export async function startRide(rideId, driverId) {
  const [ride] = await db.select().from(rides).where(
    and(eq(rides.id, rideId), eq(rides.driverId, driverId)),
  ).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.status !== 'accepted' && ride.status !== 'arriving') {
    throw { statusCode: 409, message: 'Cannot start ride in current status' };
  }

  const [updated] = await db.update(rides).set({
    status: 'started', startedAt: new Date(),
  }).where(eq(rides.id, rideId)).returning();

  await publishEvent(TOPICS.RIDE_STARTED, { id: rideId, rideId, driverId, riderId: ride.riderId });
  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: ride.riderId,
    type: 'RIDE_STARTED', title: 'Your ride has started', body: 'Enjoy your trip!',
  });
  return updated;
}

export async function completeRide(rideId, driverId) {
  const [ride] = await db.select().from(rides).where(
    and(eq(rides.id, rideId), eq(rides.driverId, driverId)),
  ).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.status !== 'started') throw { statusCode: 409, message: 'Ride has not started yet' };

  // Recalculate final fare (actual duration may differ from estimate)
  const finalFare = ride.estimatedFare; // For MVP; can recalculate with actual duration

  const [updated] = await db.update(rides).set({
    status: 'completed',
    finalFare: String(finalFare),
    completedAt: new Date(),
  }).where(eq(rides.id, rideId)).returning();

  // Release driver
  await redis.del(REDIS_KEYS.driverRideActive(driverId));
  await db.update(drivers).set({ totalRides: sql`total_rides + 1` }).where(eq(drivers.id, driverId));

  await publishEvent(TOPICS.RIDE_COMPLETED, {
    id: rideId, rideId, driverId, riderId: ride.riderId, finalFare,
  });
  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: ride.riderId,
    type: 'RIDE_COMPLETED', title: 'Ride Completed',
    body: `Your ride is complete. Total fare: ₹${finalFare}`,
  });
  return updated;
}

export async function cancelRideByDriver(rideId, driverId, reason) {
  const [ride] = await db.select().from(rides).where(
    and(eq(rides.id, rideId), eq(rides.driverId, driverId)),
  ).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.status === 'started' || ride.status === 'completed') {
    throw { statusCode: 409, message: 'Cannot cancel a started or completed ride' };
  }

  await db.update(rides).set({
    status: 'searching', driverId: null,
    cancelledBy: null, cancelReason: null, acceptedAt: null,
  }).where(eq(rides.id, rideId));

  await redis.del(REDIS_KEYS.driverRideActive(driverId));

  // Re-trigger matching from scratch
  const [updatedRide] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  startMatchingProcess(updatedRide);

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: ride.riderId,
    type: 'DRIVER_CANCELLED', title: 'Driver cancelled',
    body: 'Finding another driver for you...',
  });
  return { rematching: true };
}

export async function markArriving(rideId, driverId) {
  const [updated] = await db.update(rides).set({ status: 'arriving' }).where(
    and(eq(rides.id, rideId), eq(rides.driverId, driverId), eq(rides.status, 'accepted')),
  ).returning();
  if (!updated) throw { statusCode: 404, message: 'Ride not found or invalid status' };

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: updated.riderId,
    type: 'DRIVER_ARRIVING', title: 'Driver is arriving!',
    body: 'Your driver has arrived at the pickup point.',
  });
  return updated;
}

export async function getDriverActiveRide(driverId) {
  const rideId = await redis.get(REDIS_KEYS.driverRideActive(driverId));
  if (!rideId) return null;
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  return ride || null;
}

export async function getRideById(rideId) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  return ride;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

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

// needed for complete ride — import sql
import { sql } from 'drizzle-orm';
