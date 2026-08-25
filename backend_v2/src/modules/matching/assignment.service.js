import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  rides,
  drivers,
  rideOffers,
  dispatchJobs,
  rideDriverAssignments,
  outboxEvents,
} from '../../../drizzle/schema/index.js';
import { redis, redisPub, REDIS_KEYS } from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { releaseLocks } from './driver-lock.service.js';
import { recordStatusChange } from '../ride/ride_status_history.service.js';
import { computeApproachRoute, initTripTracking } from '../tracking/tracking.service.js';
import { removeDriverFromIndex } from './driver-geo-index.service.js';

/**
 * Assignment Service
 *
 * Handles atomic, race-condition-free binding between ride and driver.
 */

/**
 * Signals acceptance over Redis Pub/Sub so active matching wave loops break immediately.
 */
export async function signalRideAccepted(rideId) {
  await redisPub.publish(REDIS_KEYS.CHAN.rideAccepted(rideId), 'accepted').catch(() => {});
}

/**
 * Signals cancellation over Redis Pub/Sub.
 */
export async function signalRideCancelled(rideId) {
  await redisPub.publish(REDIS_KEYS.CHAN.rideAccepted(rideId), 'cancelled').catch(() => {});
}

/**
 * Performs atomic ride assignment with PostgreSQL row locks (`FOR UPDATE`).
 *
 * @param {string} rideId
 * @param {string} driverId
 * @param {Object} options { assignmentType, dispatchJobId, reason }
 * @returns {Promise<Object>} Assignment result { success: true, ride, assignment }
 */
export async function assignDriverToRide(rideId, driverId, options = {}) {
  const { assignmentType = 'automatic', dispatchJobId = null, reason = 'Offer accepted by driver' } = options;

  // 1. Fast-path check: does driver already have an active ride in Redis?
  const activeRaw = await redis.get(REDIS_KEYS.driverRideActive(driverId));
  if (activeRaw) {
    throw { statusCode: 409, message: 'You already have an active ride' };
  }

  const startOtp = String(Math.floor(1000 + Math.random() * 9000));

  // 2. Execute atomic transaction in PostgreSQL
  let assignmentRecord = null;
  let updatedRide = null;
  let acceptedOffer = null;
  let supersededOffers = [];

  await db.transaction(async (tx) => {
    // A. Lock and verify Ride row (FOR UPDATE)
    const [ride] = await tx
      .select()
      .from(rides)
      .where(and(eq(rides.id, rideId), eq(rides.status, 'searching')))
      .for('update');

    if (!ride) {
      throw { statusCode: 409, message: 'Ride is no longer available or already assigned' };
    }

    // B. Lock and verify Driver row (FOR UPDATE)
    const [driver] = await tx
      .select()
      .from(drivers)
      .where(and(eq(drivers.id, driverId), eq(drivers.isBlocked, false)))
      .for('update');

    if (!driver) {
      throw { statusCode: 403, message: 'Driver account is invalid or blocked' };
    }

    // C. Atomic offer acceptance & supersede competing offers
    const [offer] = await tx
      .update(rideOffers)
      .set({
        status: 'accepted',
        respondedAt: new Date(),
      })
      .where(and(eq(rideOffers.rideId, rideId), eq(rideOffers.driverId, driverId), eq(rideOffers.status, 'pending')))
      .returning();

    acceptedOffer = offer;

    // Supersede all other pending offers for this ride
    supersededOffers = await tx
      .update(rideOffers)
      .set({
        status: 'superseded',
        respondedAt: new Date(),
      })
      .where(and(eq(rideOffers.rideId, rideId), eq(rideOffers.status, 'pending')))
      .returning();

    // D. Update Ride status to accepted
    const [updated] = await tx
      .update(rides)
      .set({
        driverId,
        status: 'accepted',
        acceptedAt: new Date(),
        startOtp,
        updatedAt: new Date(),
      })
      .where(and(eq(rides.id, rideId), eq(rides.status, 'searching')))
      .returning();

    if (!updated) {
      throw { statusCode: 409, message: 'Ride status changed concurrently' };
    }
    updatedRide = updated;

    // E. Record durable assignment in ride_driver_assignments
    const [assignment] = await tx
      .insert(rideDriverAssignments)
      .values({
        rideId,
        driverId,
        dispatchJobId,
        offerId: offer ? offer.id : null,
        assignmentType,
        status: 'active',
        assignedAt: new Date(),
        reason,
      })
      .returning();

    assignmentRecord = assignment;

    // F. Update dispatch job if provided
    if (dispatchJobId) {
      await tx
        .update(dispatchJobs)
        .set({
          status: 'assigned',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dispatchJobs.id, dispatchJobId));
    }

    // G. Outbox event for reliable asynchronous delivery
    await tx.insert(outboxEvents).values({
      eventType: 'DriverAssigned',
      payload: {
        rideId,
        driverId,
        riderId: ride.riderId,
        assignmentId: assignment.id,
        startOtp,
        assignedAt: new Date().toISOString(),
      },
      status: 'pending',
    });
  });

  // 3. Post-transaction coordination (Redis & Sockets)
  // Release locks for winner and superseded drivers
  const driversToUnlock = [driverId, ...supersededOffers.map((o) => o.driverId)];
  await releaseLocks(driversToUnlock, rideId).catch(() => {});

  // Remove driver from available H3 index
  await removeDriverFromIndex(driverId).catch(() => {});

  // Set driver active ride in Redis
  await redis.setex(
    REDIS_KEYS.driverRideActive(driverId),
    7200,
    JSON.stringify({ rideId, riderId: updatedRide.riderId })
  );
  await redis.del(REDIS_KEYS.rideRequest(rideId));

  // Initialize live approach route and tracking
  initTripTracking(rideId, driverId, updatedRide.riderId).catch(() => {});
  computeApproachRoute(rideId, driverId, updatedRide.pickupLat, updatedRide.pickupLng).catch(() => {});

  // Record status history
  await recordStatusChange({
    rideId,
    fromStatus: 'searching',
    toStatus: 'accepted',
    changedBy: 'driver',
    changedById: driverId,
    meta: {
      assignmentId: assignmentRecord?.id,
      offerId: acceptedOffer?.id,
      ring: acceptedOffer?.ring,
      distanceKm: acceptedOffer?.distanceKm,
    },
  });

  // Signal Pub/Sub to unblock matching loop
  await signalRideAccepted(rideId);

  // Publish Kafka event
  await publishEvent(TOPICS.RIDE_ACCEPTED, {
    id: rideId,
    rideId,
    driverId,
    riderId: updatedRide.riderId,
    startOtp,
    status: 'accepted',
  });

  // Send push notification to rider
  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider',
    userId: updatedRide.riderId,
    type: 'RIDE_ACCEPTED',
    title: 'Driver on the way!',
    body: 'A driver has accepted your ride request and is heading to your pickup location.',
  });

  return {
    success: true,
    ride: updatedRide,
    assignment: assignmentRecord,
  };
}
