import { eq, desc, count, and, or, sql, gte, lte } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../../config/db.js';
import {
  rides, drivers, users, vehicleTypes, ridePassengers, tripShareTokens,
  driverEarnings, rideOffers, rideDriverAssignments, outboxEvents, dispatchJobs,
} from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { calculateFare, validateAndLockQuote } from '../fare/fare.service.js';
import { detectZone, isLocationInServiceArea } from '../zone/zone.service.js';
import { moment } from '../../utils/time.js';
import { releaseLocks } from '../matching/driver-lock.service.js';

import {
  startMatchingProcess,
  validateDriverCanAccept,
  signalRideCancelled
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
  getDriverOffers,
  expirePendingOffers
} from './ride_offer.service.js';
import {
  recordStatusChange,
  getRideHistory
} from './ride_status_history.service.js';
import { paginate } from '../../utils/response.js';
import { fromMinor, formatMoney } from '../../utils/money.js';
import { removeDriverFromIndex, upsertDriverCell } from '../matching/driver-geo-index.service.js';
import { bufferGpsPing } from '../trip-gps/gps-ping.service.js';
import { resolveRideCommission } from '../ride-payment/ride-payment.service.js';

import { finalizeTripDistance } from '../trip-gps/finalize-trip.job.js';

/** Driver-facing ride payloads must never carry the rider's start OTP. */
function stripOtp(ride) {
  if (!ride) return ride;
  const { startOtp, startOtpVerifiedAt, ...rest } = ride;
  return rest;
}

/** Re-adds a driver to the available geo-index if they're still online — called
 * after a ride ends (completed / cancelled-by-driver / cancelled-by-rider/admin
 * while a driver was already assigned) so they go back to receiving offers. */
async function reAddToGeoIndexIfOnline(driverId) {
  const [driver] = await db.select({
    isOnline: drivers.isOnline, currentLat: drivers.currentLat, currentLng: drivers.currentLng,
  }).from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (driver?.isOnline && driver.currentLat != null && driver.currentLng != null) {
    const lat = parseFloat(driver.currentLat);
    const lng = parseFloat(driver.currentLng);
    const nowMs = Date.now();
    await redis.setex(REDIS_KEYS.driverLocation(driverId), 300, JSON.stringify({ lat, lng, updatedAt: nowMs }));
    await upsertDriverCell(driverId, lat, lng, undefined, nowMs);
  }
}

// ── Rider actions ──────────────────────────────────────────────────────────────

export async function requestRide({
  riderId, vehicleTypeId,
  pickupLat, pickupLng, pickupAddress,
  dropLat, dropLng, dropAddress,
  paymentMethod = 'cash',
  promoCode = null,
  scheduledAt = null,
  quoteId = null,
  passenger = null,
}) {
  // Clean up any stale searching rides for this rider (older than 3 minutes, or any previous searching ride when re-booking)
  await db.update(rides).set({
    status: 'expired',
    cancelledAt: new Date(),
    cancelledBy: 'system',
    cancelReason: 'Auto-expired due to new ride booking',
  }).where(and(
    eq(rides.riderId, riderId),
    eq(rides.status, 'searching'),
  ));

  // Guard: rider cannot have an ongoing active ride (accepted, arriving, arrived, started)
  const [active] = await db.select({ id: rides.id, status: rides.status }).from(rides).where(and(
    eq(rides.riderId, riderId),
    or(
      eq(rides.status, 'accepted'),
      eq(rides.status, 'arriving'),
      eq(rides.status, 'arrived'),
      eq(rides.status, 'started'),
    ),
  )).limit(1);
  if (active) throw { statusCode: 409, message: 'You already have an active ride in progress' };

  let isScheduled = false;
  let scheduledDate = null;
  if (scheduledAt) {
    const scheduledMoment = moment(scheduledAt);
    if (!scheduledMoment.isValid()) throw { statusCode: 400, message: 'Invalid scheduledAt date format' };
    if (scheduledMoment.isBefore(moment().add(25, 'minutes'))) {
      throw { statusCode: 400, message: 'Scheduled rides must be booked at least 30 minutes in advance' };
    }
    scheduledDate = scheduledMoment.toDate();
    isScheduled = true;
  }

  // Geofence & Service Area check
  const pickupCheck = await isLocationInServiceArea(pickupLat, pickupLng);
  if (!pickupCheck.inServiceArea) {
    throw { statusCode: 400, code: pickupCheck.reason, message: pickupCheck.message };
  }
  const pickupZone = pickupCheck.zone;

  const dropZone = await detectZone(parseFloat(dropLat), parseFloat(dropLng));
  if (dropZone?.type === 'restricted') {
    throw { statusCode: 400, message: 'Pickup or drop-off is in a restricted geofenced area' };
  }

  // Fare snapshot / Quote resolution
  let fareData;
  if (quoteId) {
    const lockedQuote = await validateAndLockQuote(quoteId, riderId);
    fareData = {
      vehicleTypeId: lockedQuote.vehicleTypeId,
      countryId: lockedQuote.breakdown?.countryId || null,
      currencyCode: lockedQuote.currencyCode,
      appliedFareRuleIds: lockedQuote.appliedFareRuleIds || [],
      distanceKm: parseFloat(lockedQuote.distanceKm),
      durationMin: lockedQuote.durationMin,
      durationInTrafficMin: lockedQuote.durationInTrafficMin,
      polyline: lockedQuote.polyline,
      estimatedFareMinor: lockedQuote.finalFareMinor,
      breakdown: lockedQuote.breakdown,
    };
  } else {
    fareData = await calculateFare({
      pickupLat: parseFloat(pickupLat), pickupLng: parseFloat(pickupLng),
      dropLat: parseFloat(dropLat), dropLng: parseFloat(dropLng),
      vehicleTypeId,
      promoCode,
      userId: riderId,
    });
  }

  const initialStatus = isScheduled ? 'scheduled' : 'searching';
  const resolvedPaymentMethod = (paymentMethod || 'cash').toLowerCase();

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
    appliedFareRuleIds: fareData.appliedFareRuleIds,
    paymentMethod: resolvedPaymentMethod,
    status: initialStatus,
    isScheduled,
    scheduledAt: scheduledDate,
  }).returning();

  // Guest Passenger registration
  let passengerRecord = null;
  let guestTrackingToken = null;
  if (passenger && passenger.name && passenger.phoneNumber) {
    [passengerRecord] = await db.insert(ridePassengers).values({
      rideId: ride.id,
      riderId,
      passengerType: passenger.passengerType || 'other',
      name: String(passenger.name).trim(),
      phoneCountryCode: passenger.phoneCountryCode || '+91',
      phoneNumber: String(passenger.phoneNumber).trim(),
      email: passenger.email ? String(passenger.email).trim() : null,
      isPrimary: true,
    }).returning();

    // Generate public trip tracking token for the guest passenger
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = moment().add(48, 'hours').toDate();
    const [share] = await db.insert(tripShareTokens).values({
      rideId: ride.id,
      riderId,
      token,
      expiresAt,
    }).returning();
    guestTrackingToken = share.token;
  }

  await recordStatusChange({
    rideId: ride.id, fromStatus: null, toStatus: initialStatus,
    changedBy: 'rider', changedById: riderId,
    reason: isScheduled ? 'Ride scheduled by rider' : 'Ride requested by rider',
  });

  if (isScheduled) {
    return {
      ride,
      fareEstimate: fareData,
      scheduled: true,
      passenger: passengerRecord,
      trackingUrl: guestTrackingToken ? `/api/v1/public/trips/${guestTrackingToken}` : null,
    };
  }

  await publishEvent(TOPICS.RIDE_REQUESTED, { id: ride.id, ...ride });

  // Non-blocking — kicks off 1→2→3 km ring search
  startMatchingProcess(ride);

  return {
    ride,
    fareEstimate: fareData,
    passenger: passengerRecord,
    trackingUrl: guestTrackingToken ? `/api/v1/public/trips/${guestTrackingToken}` : null,
  };
}

export async function listMyScheduledRides(riderId) {
  return db.select().from(rides).where(and(
    eq(rides.riderId, riderId),
    eq(rides.status, 'scheduled'),
  )).orderBy(desc(rides.scheduledAt));
}

export async function cancelScheduledRide(rideId, riderId) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.riderId !== riderId) throw { statusCode: 403, message: 'Not your ride' };
  if (ride.status !== 'scheduled') throw { statusCode: 409, message: `Cannot cancel scheduled ride in status: ${ride.status}` };

  const [updated] = await db.update(rides).set({
    status: 'cancelled',
    cancelledBy: 'rider',
    cancelReason: 'Cancelled scheduled ride',
    cancelledAt: new Date(),
  }).where(eq(rides.id, rideId)).returning();

  await recordStatusChange({
    rideId, fromStatus: 'scheduled', toStatus: 'cancelled',
    changedBy: 'rider', changedById: riderId, reason: 'Cancelled scheduled ride',
  });

  return updated;
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
  await signalRideCancelled(rideId).catch(() => {});
  await expirePendingOffers(rideId).catch(() => {});

  if (ride.driverId) {
    await db.update(drivers).set({ isOnline: true }).where(eq(drivers.id, ride.driverId));
    // Bug 2 fix: driverRideActive now stores JSON, not bare string
    await redis.del(REDIS_KEYS.driverRideActive(ride.driverId));
    await reAddToGeoIndexIfOnline(ride.driverId)
      .catch((err) => console.error('[Ride] reAddToGeoIndexIfOnline failed:', err.message));
    await publishEvent(TOPICS.NOTIF_PUSH, {
      userType: 'driver', userId: ride.driverId,
      type: 'RIDE_CANCELLED_BY_RIDER',
      title: 'Ride Cancelled',
      body: `Rider cancelled. Reason: ${reason || 'Not specified'}`,
    });
  }

  // Real-time socket broadcast immediately to candidate drivers and rider rooms
  try {
    const { getSocketIO } = await import('../../kafka/consumers/index.js');
    const io = getSocketIO();
    if (io) {
      io.of('/rider').to(`rider:${ride.riderId}`).emit('ride:cancelled', {
        rideId,
        cancelledBy: 'rider',
        reason,
      });
      io.of('/rider').to(`ride:${rideId}`).emit('ride:cancelled', {
        rideId,
        cancelledBy: 'rider',
        reason,
      });
      if (ride.driverId) {
        io.of('/driver').to(`driver:${ride.driverId}`).emit('ride:cancelled_by_rider', {
          rideId,
          reason,
        });
      }
      // Notify all candidate drivers who had this offer open to dismiss it
      io.of('/driver').to(`ride:candidates:${rideId}`).emit('ride:taken', {
        rideId,
        reason: 'cancelled_by_rider',
      });
    }
  } catch (err) {
    console.error('[Ride] Direct socket emit on rider cancel failed:', err.message);
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

  if (review) {
    const { scanTextForProfanity, flagContentForReview } = await import('../moderation/moderation.service.js');
    const scan = scanTextForProfanity(review);
    if (scan.flagged) {
      await flagContentForReview({
        contentType: 'review',
        contentId: rideId,
        authorId: riderId,
        authorType: 'rider',
        flagReason: scan.reasons.join(','),
        flaggedText: review,
      }).catch((err) => console.error('[Moderation] flag error:', err.message));
    }
  }

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

export async function rateRider(rideId, driverId, rating, review) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.driverId !== driverId) throw { statusCode: 403, message: 'Not your ride' };
  if (ride.status !== 'completed') throw { statusCode: 409, message: 'Can only rate completed rides' };
  if (ride.riderRating) throw { statusCode: 409, message: 'Already rated' };

  await db.update(rides).set({ riderRating: rating, riderReview: review }).where(eq(rides.id, rideId));

  if (review) {
    const { scanTextForProfanity, flagContentForReview } = await import('../moderation/moderation.service.js');
    const scan = scanTextForProfanity(review);
    if (scan.flagged) {
      await flagContentForReview({
        contentType: 'review',
        contentId: rideId,
        authorId: driverId,
        authorType: 'driver',
        flagReason: scan.reasons.join(','),
        flaggedText: review,
      }).catch((err) => console.error('[Moderation] flag error:', err.message));
    }
  }

  const [rider] = await db.select({ rating: users.rating, totalRides: users.totalRides })
    .from(users).where(eq(users.id, ride.riderId)).limit(1);
  const currentCount = parseInt(rider?.totalRides || '1', 10);
  const newRating = ((parseFloat(rider?.rating || '5.00') * currentCount) + rating) / (currentCount + 1);
  await db.update(users).set({
    rating: String(newRating.toFixed(2)),
  }).where(eq(users.id, ride.riderId));

  return { rated: true };
}

export async function getRideReceipt(rideId, requesterId) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.riderId !== requesterId && ride.driverId !== requesterId) {
    throw { statusCode: 403, message: 'Not authorized to access receipt for this ride' };
  }
  if (ride.status !== 'completed') {
    throw { statusCode: 400, message: `Receipt is only available for completed rides (current status: ${ride.status})` };
  }

  const [rider] = await db.select({ name: users.name, email: users.email, phone: users.phone })
    .from(users).where(eq(users.id, ride.riderId)).limit(1);

  let driverInfo = null;
  if (ride.driverId) {
    const [driver] = await db.select({
      name: drivers.name,
      vehicleModel: drivers.vehicleModel,
      vehicleNumber: drivers.vehicleNumber,
    }).from(drivers).where(eq(drivers.id, ride.driverId)).limit(1);
    driverInfo = driver;
  }

  const totalFareMinor = ride.finalFareMinor || ride.estimatedFareMinor || 0;

  return {
    receiptId: `REC-${ride.id.slice(0, 8).toUpperCase()}`,
    rideId: ride.id,
    completedAt: ride.completedAt || ride.updatedAt,
    rider: rider || null,
    driver: driverInfo || null,
    pickupAddress: ride.pickupAddress,
    dropAddress: ride.dropAddress,
    distanceKm: ride.actualDistanceKm || ride.distanceKm,
    durationMin: ride.actualDurationMin || ride.durationMin,
    currencyCode: ride.currencyCode || 'USD',
    itemization: {
      fareSnapshot: ride.fareSnapshot,
      baseFareMinor: ride.fareSnapshot?.baseFareMinor || totalFareMinor,
      distanceChargeMinor: ride.fareSnapshot?.distanceChargeMinor || 0,
      timeChargeMinor: ride.fareSnapshot?.timeChargeMinor || 0,
      surgeMultiplier: ride.fareSnapshot?.surgeMultiplier || '1.00',
      promoDiscountMinor: ride.fareSnapshot?.promoDiscountMinor || 0,
      finalFareMinor: totalFareMinor,
    },
    paymentMethod: ride.paymentMethod || 'online',
    paymentStatus: ride.paymentStatus || 'paid',
  };
}



// ── Driver actions ─────────────────────────────────────────────────────────────

export async function acceptRide(rideId, driverId, options = {}) {
  const { assignmentType = 'automatic', dispatchJobId = null, reason = 'Offer accepted by driver' } = options;

  await validateDriverCanAccept(rideId, driverId);

  // Fast-path check in Redis
  const activeRaw = await redis.get(REDIS_KEYS.driverRideActive(driverId));
  if (activeRaw) throw { statusCode: 409, message: 'You already have an active ride' };

  const startOtp = String(Math.floor(1000 + Math.random() * 9000));

  let updatedRide = null;
  let acceptedOffer = null;
  let supersededOffers = [];
  let driverDetails = null;

  await db.transaction(async (tx) => {
    // 1. Lock ride row (FOR UPDATE)
    const [ride] = await tx.select().from(rides)
      .where(and(eq(rides.id, rideId), eq(rides.status, 'searching')))
      .for('update');
    if (!ride) {
      throw { statusCode: 409, message: 'Ride is no longer available or already accepted by another driver' };
    }

    // 2. Lock driver row (FOR UPDATE)
    const [driver] = await tx.select().from(drivers)
      .where(and(eq(drivers.id, driverId), eq(drivers.isBlocked, false)))
      .for('update');
    if (!driver) {
      throw { statusCode: 403, message: 'Driver account is invalid or blocked' };
    }
    driverDetails = driver;

    // 3. Atomically accept driver's offer
    const [offer] = await tx.update(rideOffers).set({
      status: 'accepted',
      respondedAt: new Date(),
    }).where(and(
      eq(rideOffers.rideId, rideId),
      eq(rideOffers.driverId, driverId),
      eq(rideOffers.status, 'pending'),
    )).returning();

    acceptedOffer = offer;

    // 4. Supersede all other pending offers for this ride
    supersededOffers = await tx.update(rideOffers).set({
      status: 'superseded',
      respondedAt: new Date(),
    }).where(and(
      eq(rideOffers.rideId, rideId),
      eq(rideOffers.status, 'pending'),
    )).returning();

    // 5. Update ride status and assign driver
    const [updated] = await tx.update(rides).set({
      driverId,
      status: 'accepted',
      acceptedAt: new Date(),
      startOtp,
      updatedAt: new Date(),
    }).where(and(eq(rides.id, rideId), eq(rides.status, 'searching'))).returning();

    if (!updated) {
      throw { statusCode: 409, message: 'Ride was just accepted by another driver' };
    }
    updatedRide = updated;

    // 6. Record assignment in ride_driver_assignments
    await tx.insert(rideDriverAssignments).values({
      rideId,
      driverId,
      dispatchJobId,
      offerId: offer?.id || null,
      assignmentType,
      status: 'active',
      assignedAt: new Date(),
      reason,
    });

    // 7. Update dispatch job if provided
    if (dispatchJobId) {
      await tx.update(dispatchJobs).set({
        status: 'assigned',
        completedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(dispatchJobs.id, dispatchJobId));
    }

    // 8. Outbox event for reliable delivery
    await tx.insert(outboxEvents).values({
      aggregateType: 'ride',
      aggregateId: rideId,
      topic: TOPICS.RIDE_ACCEPTED,
      payload: {
        rideId,
        driverId,
        riderId: ride.riderId,
        startOtp,
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          vehicleNumber: driver.vehicleNumber,
          vehicleModel: driver.vehicleModel,
          rating: driver.rating,
          profilePhoto: driver.profilePhoto,
        },
      },
      status: 'pending',
    });
  });

  // 9. Post-transaction coordination (outside DB transaction)
  const driversToUnlock = [driverId, ...supersededOffers.map((o) => o.driverId)];
  await releaseLocks(driversToUnlock, rideId).catch(() => {});

  await recordStatusChange({
    rideId,
    fromStatus: 'searching',
    toStatus: 'accepted',
    changedBy: 'driver',
    changedById: driverId,
    meta: {
      offerId: acceptedOffer?.id,
      ring: acceptedOffer?.ring,
      distanceKm: acceptedOffer?.distanceKm,
    },
  });

  await redis.setex(
    REDIS_KEYS.driverRideActive(driverId),
    7200,
    JSON.stringify({ rideId, riderId: updatedRide.riderId }),
  );
  await redis.del(REDIS_KEYS.rideRequest(rideId));

  await removeDriverFromIndex(driverId).catch((err) =>
    console.error('[Ride] removeDriverFromIndex failed:', err.message),
  );

  // Compute approach route (driver -> pickup) fire-and-forget
  if (driverDetails) {
    computeApproachRoute(updatedRide, driverDetails).catch((err) =>
      console.error('[Ride] computeApproachRoute failed:', err.message),
    );
  }

  // Real-time socket broadcast immediately
  try {
    const { getSocketIO } = await import('../../kafka/consumers/index.js');
    const io = getSocketIO();
    if (io) {
      io.of('/rider').to(`rider:${updatedRide.riderId}`).emit('ride:driver_assigned', {
        rideId,
        driver: driverDetails,
        startOtp,
      });
      io.of('/rider').to(`ride:${rideId}`).emit('ride:driver_assigned', {
        rideId,
        driver: driverDetails,
        startOtp,
      });
      io.of('/driver').to(`ride:candidates:${rideId}`).emit('ride:taken', {
        rideId,
      });
    }
  } catch (err) {
    console.error('[Ride] Direct socket emit on accept failed:', err.message);
  }

  // Signal matching engine via pub/sub
  const { signalRideAccepted } = await import('../matching/matching.service.js');
  await signalRideAccepted(rideId).catch(() => {});

  await publishEvent(TOPICS.RIDE_ACCEPTED, {
    id: rideId, rideId, driverId,
    driver: driverDetails,
    riderId: updatedRide.riderId,
    startOtp,
  });

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: updatedRide.riderId,
    type: 'RIDE_ACCEPTED',
    title: 'Driver Found!',
    body: `${driverDetails?.name || 'Driver'} is on the way — ${driverDetails?.vehicleModel || ''} ${driverDetails?.vehicleNumber || ''}. Share OTP ${startOtp} with the driver to start your ride.`,
  });

  return stripOtp(updatedRide);
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
    title: 'Driver is on the way!',
    body: 'Your driver is approaching the pickup point.',
  });
  return stripOtp(updated);
}

export async function markDriverArrived(rideId, driverId) {
  const [ride] = await db.select().from(rides).where(
    and(eq(rides.id, rideId), eq(rides.driverId, driverId)),
  ).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.status !== 'accepted' && ride.status !== 'arriving') {
    throw { statusCode: 409, message: `Cannot mark arrived for ride in status: ${ride.status}` };
  }

  const arrivedAt = new Date();
  const [updated] = await db.update(rides).set({
    status: 'arrived',
    driverArrivedAt: arrivedAt,
    waitingStartedAt: arrivedAt,
  }).where(eq(rides.id, rideId)).returning();

  await recordStatusChange({
    rideId, fromStatus: ride.status, toStatus: 'arrived',
    changedBy: 'driver', changedById: driverId,
    reason: 'Driver arrived at pickup location',
  });

  const { getSocketIO } = await import('../../kafka/consumers/index.js');
  const io = getSocketIO();
  if (io) {
    io.of('/rider').to(`ride:${rideId}`).emit('driver:arrived', {
      rideId,
      driverArrivedAt: arrivedAt,
      freeWaitingMinutes: 3,
    });
    io.of('/rider').to(`rider:${ride.riderId}`).emit('driver:arrived', {
      rideId,
      driverArrivedAt: arrivedAt,
      freeWaitingMinutes: 3,
    });
  }

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: updated.riderId,
    type: 'DRIVER_ARRIVED',
    title: 'Driver has arrived!',
    body: 'Your driver has arrived at the pickup point. 3 minutes of complimentary waiting included.',
  });

  return stripOtp(updated);
}

export async function cancelNoShow(rideId, driverId, reason = 'rider_no_show') {
  const [ride] = await db.select().from(rides).where(
    and(eq(rides.id, rideId), eq(rides.driverId, driverId)),
  ).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.status !== 'arrived') {
    throw { statusCode: 409, message: `Cannot declare no-show for ride in status: ${ride.status}. Driver must mark arrived first.` };
  }

  const now = Date.now();
  const arrivedTime = ride.driverArrivedAt ? new Date(ride.driverArrivedAt).getTime() : now;
  const waitingDurationSec = Math.floor((now - arrivedTime) / 1000);

  // Standard no-show fee
  const noShowFeeMinor = Math.max(5000, Math.round((ride.estimatedFareMinor || 10000) * 0.5));
  const driverShareMinor = Math.round(noShowFeeMinor * 0.8); // 80% to driver
  const commissionMinor = noShowFeeMinor - driverShareMinor; // 20% platform

  const [updated] = await db.update(rides).set({
    status: 'cancelled',
    cancelledBy: 'driver',
    cancelReason: reason || 'rider_no_show',
    cancelledAt: new Date(),
    waitingDurationSec,
    noShowFeeMinor,
    finalFareMinor: noShowFeeMinor,
    paymentStatus: 'pending',
  }).where(eq(rides.id, rideId)).returning();

  await recordStatusChange({
    rideId, fromStatus: 'arrived', toStatus: 'cancelled',
    changedBy: 'driver', changedById: driverId,
    reason: 'Driver declared passenger no-show',
    meta: { waitingDurationSec, noShowFeeMinor, driverShareMinor },
  });

  // Record driver earnings for no-show compensation
  await db.insert(driverEarnings).values({
    driverId,
    rideId,
    grossFareMinor: noShowFeeMinor,
    platformCommissionMinor: commissionMinor,
    netFareMinor: driverShareMinor,
    currencyCode: ride.currencyCode || 'USD',
    status: 'available',
  });

  // Cleanup tracking and free driver
  await redis.del(REDIS_KEYS.driverRideActive(driverId));
  await cleanupRideTracking(rideId);
  await reAddToGeoIndexIfOnline(driverId)
    .catch((err) => console.error('[Ride] reAddToGeoIndexIfOnline failed:', err.message));

  const { getSocketIO } = await import('../../kafka/consumers/index.js');
  const io = getSocketIO();
  if (io) {
    io.of('/rider').to(`ride:${rideId}`).emit('ride:cancelled', {
      rideId,
      cancelledBy: 'driver',
      reason: 'rider_no_show',
      noShowFeeMinor,
    });
  }

  return stripOtp(updated);
}

export async function startRide(rideId, driverId, otp) {
  let updated;
  let previousStatus;
  let riderId;
  await db.transaction(async (tx) => {
    const [ride] = await tx.select().from(rides).where(
      and(eq(rides.id, rideId), eq(rides.driverId, driverId)),
    ).for('update').limit(1);

    if (!ride) throw { statusCode: 404, message: 'Ride not found' };
    if (ride.status !== 'accepted' && ride.status !== 'arriving' && ride.status !== 'arrived') {
      throw { statusCode: 409, message: `Cannot start ride in status: ${ride.status}` };
    }
    if (!otp || String(otp) !== ride.startOtp) {
      throw { statusCode: 400, message: 'Invalid or missing OTP. Ask the rider for the ride start OTP.' };
    }

    let waitingDurationSec = 0;
    if (ride.driverArrivedAt) {
      waitingDurationSec = Math.max(0, Math.floor((Date.now() - new Date(ride.driverArrivedAt).getTime()) / 1000));
    }

    const [u] = await tx.update(rides).set({
      status: 'started',
      startedAt: new Date(),
      startOtpVerifiedAt: new Date(),
      waitingDurationSec,
    }).where(eq(rides.id, rideId)).returning();
    updated = u;
    previousStatus = ride.status;
    riderId = ride.riderId;

    await tx.insert(outboxEvents).values({
      aggregateType: 'ride',
      aggregateId: rideId,
      topic: TOPICS.RIDE_STARTED,
      payload: { id: rideId, rideId, driverId, riderId },
    });
  });

  await recordStatusChange({
    rideId, fromStatus: previousStatus, toStatus: 'started',
    changedBy: 'driver', changedById: driverId,
  });

  // Initialise trip tracking (decode polyline, store progress context)
  initTripTracking(updated).catch((err) =>
    console.error('[Ride] initTripTracking failed:', err.message),
  );

  await publishEvent(TOPICS.RIDE_STARTED, { id: rideId, rideId, driverId, riderId });
  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: riderId,
    type: 'RIDE_STARTED',
    title: 'Your ride has started',
    body: 'Enjoy your trip!',
  });
  return stripOtp(updated);
}

export async function tipDriver(rideId, riderId, tipAmountMinor) {
  if (!tipAmountMinor || !Number.isInteger(tipAmountMinor) || tipAmountMinor <= 0) {
    throw { statusCode: 400, message: 'tipAmountMinor must be a positive integer' };
  }

  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.riderId !== riderId) throw { statusCode: 403, message: 'Unauthorized: Not your ride' };
  if (ride.status !== 'completed') {
    throw { statusCode: 400, message: `Tips can only be added for completed rides (current status: ${ride.status})` };
  }
  if (!ride.driverId) throw { statusCode: 400, message: 'No driver assigned to this ride' };

  // Update ride tip amount
  const newTipTotal = (ride.tipMinor || 0) + tipAmountMinor;
  await db.update(rides).set({
    tipMinor: newTipTotal,
  }).where(eq(rides.id, rideId));

  // Update or insert driver earnings entry
  const [existingEarning] = await db.select().from(driverEarnings).where(eq(driverEarnings.rideId, rideId)).limit(1);
  if (existingEarning) {
    await db.update(driverEarnings).set({
      tipMinor: (existingEarning.tipMinor || 0) + tipAmountMinor,
      netFareMinor: existingEarning.netFareMinor + tipAmountMinor,
      updatedAt: new Date(),
    }).where(eq(driverEarnings.id, existingEarning.id));
  } else {
    await db.insert(driverEarnings).values({
      driverId: ride.driverId,
      rideId,
      grossFareMinor: tipAmountMinor,
      platformCommissionMinor: 0,
      netFareMinor: tipAmountMinor,
      tipMinor: tipAmountMinor,
      currencyCode: ride.currencyCode || 'USD',
      status: 'available',
    });
  }

  // Double-entry ledger settlement: credit driver wallet
  try {
    const { getOrCreateAccount, postTransaction } = await import('../ledger/ledger.service.js');
    const driverAccount = await getOrCreateAccount({
      code: `DRIVER_WALLET_${ride.driverId}`,
      currencyCode: ride.currencyCode || 'USD',
      ownerType: 'driver',
      ownerId: ride.driverId,
    });
    const platformTipHolding = await getOrCreateAccount({
      code: 'PLATFORM_TIP_CLEARING',
      currencyCode: ride.currencyCode || 'USD',
      accountCategory: 'LIABILITY',
    });

    await postTransaction({
      businessType: 'RIDE_TIP',
      idempotencyKey: `tip-${rideId}-${Date.now()}`,
      entries: [
        { accountId: platformTipHolding.id, direction: 'debit', amountMinor: tipAmountMinor, currencyCode: ride.currencyCode || 'USD' },
        { accountId: driverAccount.id, direction: 'credit', amountMinor: tipAmountMinor, currencyCode: ride.currencyCode || 'USD' },
      ],
      referenceType: 'ride',
      referenceId: rideId,
      metadata: { rideId, riderId, driverId: ride.driverId, tipAmountMinor },
    });
  } catch (err) {
    console.error('[Ride] Tipping ledger posting error:', err.message);
  }

  // Notify driver in real-time
  const { getSocketIO } = await import('../../kafka/consumers/index.js');
  const io = getSocketIO();
  if (io) {
    io.of('/driver').to(`driver:${ride.driverId}`).emit('driver:tip_received', {
      rideId,
      tipAmountMinor,
      totalTipMinor: newTipTotal,
      currencyCode: ride.currencyCode || 'USD',
    });
  }

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'driver', userId: ride.driverId,
    type: 'TIP_RECEIVED',
    title: 'You received a tip! 💰',
    body: `A rider tipped you ${formatMoney(tipAmountMinor, ride.currencyCode)} for ride #${rideId.slice(0, 8)}.`,
  });

  return {
    success: true,
    rideId,
    tipAmountMinor,
    totalTipMinor: newTipTotal,
    currencyCode: ride.currencyCode || 'USD',
  };
}

export async function completeRide(rideId, driverId) {
  let updated;
  let grossFareMinor;
  let finalFareMinor;
  let promoDiscountMinor;
  let driverEarningsMinor;
  let platformCommissionMinor;
  let actualDurationMin;
  let ride;
  let snapshot;
  let commission;

  await db.transaction(async (tx) => {
    const [lockedRide] = await tx.select().from(rides).where(
      and(eq(rides.id, rideId), eq(rides.driverId, driverId)),
    ).for('update').limit(1);

    if (!lockedRide) throw { statusCode: 404, message: 'Ride not found' };
    if (lockedRide.status !== 'started') throw { statusCode: 409, message: `Ride has not started yet (current status: ${lockedRide.status})` };

    ride = lockedRide;
    actualDurationMin = ride.startedAt
      ? Math.ceil((Date.now() - new Date(ride.startedAt).getTime()) / 60_000)
      : ride.durationMin;

    snapshot = ride.fareSnapshot || {};
    const baseFareMinor = snapshot.breakdown?.baseFareMinor ?? Math.round((snapshot.originalEstimatedFareMinor || ride.estimatedFareMinor) * 0.2);
    const distanceFareMinor = snapshot.breakdown?.distanceFareMinor ?? Math.round((snapshot.originalEstimatedFareMinor || ride.estimatedFareMinor) * 0.6);
    const perMinRateMinor = snapshot.breakdown?.timeFareMinor
      ? snapshot.breakdown.timeFareMinor / Math.max(ride.durationMin, 1)
      : 0;
    const actualTimeFareMinor = perMinRateMinor * actualDurationMin;
    const zoneMultiplier = snapshot.breakdown?.zoneMultiplier ?? 1;
    const surgeMultiplier = snapshot.breakdown?.surgeMultiplier ?? 1;
    const minFareMinor = snapshot.breakdown?.minFareMinor ?? 0;
    const rawFinalFareMinor = (baseFareMinor + distanceFareMinor + actualTimeFareMinor) * zoneMultiplier * surgeMultiplier;
    grossFareMinor = Math.ceil(Math.max(rawFinalFareMinor, minFareMinor));

    promoDiscountMinor = snapshot.breakdown?.promo?.discountAmountMinor
      || snapshot.discountAmountMinor
      || 0;
    finalFareMinor = Math.max(0, grossFareMinor - promoDiscountMinor);

    try {
      commission = await resolveRideCommission({ ...ride, grossFareMinor, finalFareMinor }, { skipDbUpdate: true });
    } catch (err) {
      console.error('[Ride] resolveRideCommission failed:', err.message);
    }

    driverEarningsMinor = commission?.driverEarningsMinor ?? Math.round(grossFareMinor * 0.8);
    platformCommissionMinor = commission?.commissionMinor ?? (grossFareMinor - driverEarningsMinor);

    await tx.insert(driverEarnings).values({
      driverId,
      rideId,
      grossFareMinor,
      platformCommissionMinor,
      netFareMinor: driverEarningsMinor,
      currencyCode: ride.currencyCode || 'INR',
      status: 'available',
    });

    const [u] = await tx.update(rides).set({
      status: 'completed',
      finalFareMinor,
      durationMin: actualDurationMin,
      completedAt: new Date(),
      fareSnapshot: {
        ...(snapshot || {}),
        grossFareMinor,
        discountAmountMinor: promoDiscountMinor,
        finalFareMinor,
        commission: commission ? { ruleId: commission.ruleId, ...commission } : {
          grossFareMinor,
          promoDiscountMinor,
          platformSubsidyMinor: promoDiscountMinor,
          commissionMinor: platformCommissionMinor,
          driverEarningsMinor,
        },
      },
    }).where(eq(rides.id, rideId)).returning();
    updated = u;

    await tx.insert(outboxEvents).values({
      aggregateType: 'ride',
      aggregateId: rideId,
      topic: TOPICS.RIDE_COMPLETED,
      payload: {
        id: rideId,
        rideId,
        driverId,
        riderId: ride.riderId,
        finalFareMinor,
        grossFareMinor,
        driverEarningsMinor,
        currencyCode: ride.currencyCode,
      },
    });

    await tx.update(drivers).set({ totalRides: sql`total_rides + 1` })
      .where(eq(drivers.id, driverId));
  });

  await recordStatusChange({
    rideId, fromStatus: 'started', toStatus: 'completed',
    changedBy: 'driver', changedById: driverId,
    meta: { grossFareMinor, finalFareMinor, actualDurationMin, driverEarningsMinor, platformCommissionMinor },
  });

  // Release driver
  await redis.del(REDIS_KEYS.driverRideActive(driverId));
  await cleanupRideTracking(rideId);
  await reAddToGeoIndexIfOnline(driverId)
    .catch((err) => console.error('[Ride] reAddToGeoIndexIfOnline failed:', err.message));

  // Direct socket broadcast to rider room so customer UI switches to completed state immediately
  try {
    const { getSocketIO } = await import('../../kafka/consumers/index.js');
    const io = getSocketIO();
    if (io) {
      io.of('/rider').to(`rider:${ride.riderId}`).emit('ride:completed', {
        rideId,
        finalFareMinor,
        grossFareMinor,
        currencyCode: ride.currencyCode,
      });
      io.of('/rider').to(`ride:${rideId}`).emit('ride:completed', {
        rideId,
        finalFareMinor,
        grossFareMinor,
        currencyCode: ride.currencyCode,
      });
    }
  } catch (err) {
    console.error('[Ride] Direct socket emit on ride complete failed:', err.message);
  }

  // Fire-and-forget (same pattern as computeApproachRoute/initTripTracking above):
  // recomputes the fare from actual GPS-derived distance/time using the SAME
  // rate-card version + zone/surge rules stamped on the ride at request time,
  // and flags the trip for manual review instead of auto-billing if actual
  // exceeds the estimate by more than the configured deviation tolerance.
  finalizeTripDistance(rideId).catch((err) =>
    console.error('[Ride] finalizeTripDistance failed:', err.message),
  );

  await publishEvent(TOPICS.RIDE_COMPLETED, {
    id: rideId, rideId, driverId, riderId: ride.riderId,
    finalFare: fromMinor(finalFareMinor, ride.currencyCode),
    grossFare: fromMinor(grossFareMinor, ride.currencyCode),
    driverEarnings: fromMinor(driverEarningsMinor, ride.currencyCode),
    currency: ride.currencyCode,
  });

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: ride.riderId,
    type: 'RIDE_COMPLETED',
    title: 'Ride Completed',
    body: `Your ride is complete. Total fare: ${formatMoney(finalFareMinor, ride.currencyCode)}`,
  });

  if (driverId) {
    await publishEvent(TOPICS.NOTIF_PUSH, {
      userType: 'driver', userId: driverId,
      type: 'RIDE_COMPLETED',
      title: 'Trip Completed',
      body: `Trip complete. Take-home earnings: ${formatMoney(driverEarningsMinor, ride.currencyCode)} (Gross: ${formatMoney(grossFareMinor, ride.currencyCode)}, Commission: ${formatMoney(platformCommissionMinor, ride.currencyCode)})`,
    });
  }

  if (snapshot.breakdown?.promo?.promoId) {
    const { recordPromoUsage } = await import('../promo/promo.service.js');
    await recordPromoUsage(
      snapshot.breakdown.promo.promoId,
      ride.riderId,
      rideId,
      snapshot.breakdown.promo.discountAmountMinor || 0,
    ).catch((err) => console.error('[Promo] record usage error:', err.message));
  }

  const { processReferralRewardOnFirstRide } = await import('../promo/promo.service.js');
  await processReferralRewardOnFirstRide(ride.riderId, ride.currencyCode)
    .catch((err) => console.error('[Referral] reward error:', err.message));

  // Automatically settle ride payments on completion:
  if (ride.paymentMethod?.toLowerCase() === 'wallet') {
    if (updated.paymentStatus !== 'paid') {
      try {
        const { payRideWithWallet } = await import('../ride-payment/ride-payment.service.js');
        await payRideWithWallet(ride.riderId, rideId, `auto_complete_wallet:${rideId}`);
      } catch (err) {
        console.error('[Ride] auto wallet settlement on completion error:', err.message);
      }
    }
  } else {
    // For cash payment, automatically record cash collection so the commission is debited against driver's wallet (negative balance)
    try {
      const { recordCashCollection } = await import('../ride-payment/ride-payment.service.js');
      await recordCashCollection(driverId, rideId, finalFareMinor);
    } catch (err) {
      console.error('[Ride] auto cash commission settlement on completion error:', err.message);
    }
  }

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
  await reAddToGeoIndexIfOnline(driverId)
    .catch((err) => console.error('[Ride] reAddToGeoIndexIfOnline failed:', err.message));

  // Direct real-time socket emit to rider so customer UI updates immediately
  try {
    const { getSocketIO } = await import('../../kafka/consumers/index.js');
    const io = getSocketIO();
    if (io) {
      io.of('/rider').to(`rider:${ride.riderId}`).emit('ride:driver_cancelled', {
        rideId,
        cancelledBy: 'driver',
        reason: reason || 'Driver cancelled the ride',
      });
      io.of('/rider').to(`ride:${rideId}`).emit('ride:driver_cancelled', {
        rideId,
        cancelledBy: 'driver',
        reason: reason || 'Driver cancelled the ride',
      });
    }
  } catch (err) {
    console.error('[Ride] Direct socket emit on driver cancel failed:', err.message);
  }

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: ride.riderId,
    type: 'DRIVER_CANCELLED',
    title: 'Driver cancelled',
    body: 'Your driver cancelled the ride. We are finding another driver for you.',
  });
  return { rematching: true };
}

/**
 * Called by Socket.IO location_update handler.
 * Routes to the correct tracking phase based on current ride status.
 */
export async function handleDriverLocationUpdate(driverId, lat, lng, gpsMeta = {}) {
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
    // Buffer for billing/audit — separate from the live progress display above.
    // Buffered in Redis and batch-flushed by a BullMQ worker (see trip-gps/
    // gps-ping.service.js) rather than inserted per-ping, matching this same
    // handler's original comment about avoiding a DB write on every tick.
    await bufferGpsPing(rideId, driverId, lat, lng, gpsMeta)
      .catch((err) => console.error('[Ride] bufferGpsPing failed:', err.message));
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
  const activeStatuses = ['accepted', 'arriving', 'arrived', 'started'];
  let ride = null;
  const raw = await redis.get(REDIS_KEYS.driverRideActive(driverId));
  if (raw) {
    try {
      const { rideId } = JSON.parse(raw);
      const [r] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
      if (r && activeStatuses.includes(r.status)) {
        ride = r;
      }
    } catch (e) {
      console.error('[Ride] Error parsing driverRideActive key:', e.message);
    }
    if (!ride) {
      // Key was stale or ride is completed/cancelled — purge stale Redis key
      await redis.del(REDIS_KEYS.driverRideActive(driverId));
    }
  }

  if (!ride) {
    // Fallback: Check DB directly for any active ongoing ride assigned to this driver
    const [dbRide] = await db.select().from(rides).where(
      and(
        eq(rides.driverId, driverId),
        or(
          eq(rides.status, 'accepted'),
          eq(rides.status, 'arriving'),
          eq(rides.status, 'arrived'),
          eq(rides.status, 'started'),
        ),
      ),
    ).orderBy(desc(rides.requestedAt)).limit(1);

    if (dbRide) {
      ride = dbRide;
      // Re-populate Redis cache with valid active ride
      await redis.setex(
        REDIS_KEYS.driverRideActive(driverId),
        7200,
        JSON.stringify({ rideId: dbRide.id, riderId: dbRide.riderId }),
      );
    }
  }

  if (!ride) return null;

  let rider = null;
  if (ride.riderId) {
    const [u] = await db.select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      avatar: users.avatar,
      rating: users.rating,
    }).from(users).where(eq(users.id, ride.riderId)).limit(1);
    if (u) {
      rider = u;
    }
  }

  return stripOtp({
    ...ride,
    rider,
    riderName: rider?.name || ride.riderName || 'Rider',
    riderPhone: rider?.phone || ride.riderPhone || '',
    riderAvatar: rider?.avatar || ride.riderAvatar || null,
  });
}

export async function getRiderActiveRide(riderId) {
  const [ride] = await db.select().from(rides).where(and(
    eq(rides.riderId, riderId),
    or(
      eq(rides.status, 'searching'),
      eq(rides.status, 'accepted'),
      eq(rides.status, 'arriving'),
      eq(rides.status, 'arrived'),
      eq(rides.status, 'started'),
    ),
  )).orderBy(desc(rides.requestedAt)).limit(1);

  if (!ride) return null;

  let driver = null;
  if (ride.driverId) {
    const [d] = await db.select({
      id: drivers.id,
      name: drivers.name,
      phone: drivers.phone,
      vehicleNumber: drivers.vehicleNumber,
      vehicleModel: drivers.vehicleModel,
      rating: drivers.rating,
      profilePhoto: drivers.profilePhoto,
      currentLat: drivers.currentLat,
      currentLng: drivers.currentLng,
    }).from(drivers).where(eq(drivers.id, ride.driverId)).limit(1);

    if (d) {
      const [{ totalRides }] = await db.select({ totalRides: count() })
        .from(rides)
        .where(and(eq(rides.driverId, ride.driverId), eq(rides.status, 'completed')));

      const [{ countWithRider }] = await db.select({ countWithRider: count() })
        .from(rides)
        .where(and(
          eq(rides.driverId, ride.driverId),
          eq(rides.riderId, riderId),
          eq(rides.status, 'completed')
        ));

      driver = {
        ...d,
        totalRides: Number(totalRides || 0),
        ridesWithThisRider: Number(countWithRider || 0),
      };
    }
  }

  return {
    ...ride,
    driver,
  };
}

export async function getRideById(rideId) {
  const [ride] = await db.select({
    id: rides.id,
    riderId: rides.riderId,
    driverId: rides.driverId,
    vehicleTypeId: rides.vehicleTypeId,
    countryId: rides.countryId,
    currencyCode: rides.currencyCode,
    pickupLat: rides.pickupLat,
    pickupLng: rides.pickupLng,
    pickupAddress: rides.pickupAddress,
    dropLat: rides.dropLat,
    dropLng: rides.dropLng,
    dropAddress: rides.dropAddress,
    fareSnapshot: rides.fareSnapshot,
    appliedFareRuleIds: rides.appliedFareRuleIds,
    estimatedFareMinor: rides.estimatedFareMinor,
    finalFareMinor: rides.finalFareMinor,
    distanceKm: rides.distanceKm,
    durationMin: rides.durationMin,
    actualDistanceKm: rides.actualDistanceKm,
    actualDurationMin: rides.actualDurationMin,
    status: rides.status,
    isScheduled: rides.isScheduled,
    scheduledAt: rides.scheduledAt,
    driverArrivedAt: rides.driverArrivedAt,
    paymentMethod: rides.paymentMethod,
    paymentStatus: rides.paymentStatus,
    cancelledBy: rides.cancelledBy,
    cancelReason: rides.cancelReason,
    riderRating: rides.riderRating,
    driverRating: rides.driverRating,
    riderReview: rides.riderReview,
    driverReview: rides.driverReview,
    requestedAt: rides.requestedAt,
    acceptedAt: rides.acceptedAt,
    startedAt: rides.startedAt,
    completedAt: rides.completedAt,
    cancelledAt: rides.cancelledAt,
    riderName: users.name,
    riderPhone: users.phone,
    riderAvatar: users.avatar,
    riderRatingAverage: users.rating,
    vehicleTypeName: vehicleTypes.name,
    vehicleTypeIcon: vehicleTypes.icon,
  })
    .from(rides)
    .leftJoin(users, eq(rides.riderId, users.id))
    .leftJoin(vehicleTypes, eq(rides.vehicleTypeId, vehicleTypes.id))
    .where(eq(rides.id, rideId))
    .limit(1);

  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  let driver = null;
  if (ride.driverId) {
    const [d] = await db.select({
      id: drivers.id,
      name: drivers.name,
      phone: drivers.phone,
      vehicleNumber: drivers.vehicleNumber,
      vehicleModel: drivers.vehicleModel,
      rating: drivers.rating,
      profilePhoto: drivers.profilePhoto,
      currentLat: drivers.currentLat,
      currentLng: drivers.currentLng,
    }).from(drivers).where(eq(drivers.id, ride.driverId)).limit(1);

    if (d) {
      const [{ totalRides }] = await db.select({ totalRides: count() })
        .from(rides)
        .where(and(eq(rides.driverId, ride.driverId), eq(rides.status, 'completed')));

      let countWithRider = 0;
      if (ride.riderId) {
        const [{ countWithRider: c }] = await db.select({ countWithRider: count() })
          .from(rides)
          .where(and(
            eq(rides.driverId, ride.driverId),
            eq(rides.riderId, ride.riderId),
            eq(rides.status, 'completed')
          ));
        countWithRider = c;
      }

      driver = {
        ...d,
        totalRides: Number(totalRides || 0),
        ridesWithThisRider: Number(countWithRider || 0),
      };
    }
  }

  return {
    ...ride,
    driver,
  };
}

export async function getDriverRideHistory(driverId, { page = 1, limit = 20, offset = 0, status, fromDate, toDate, minEarnings, maxEarnings } = {}) {
  const conditions = [eq(rides.driverId, driverId)];

  if (status && status !== 'all') {
    if (status === 'completed') {
      conditions.push(eq(rides.status, 'completed'));
    } else if (status === 'cancelled') {
      conditions.push(eq(rides.status, 'cancelled'));
    } else {
      conditions.push(eq(rides.status, status));
    }
  }

  if (fromDate) {
    const from = new Date(fromDate);
    if (!isNaN(from.getTime())) {
      conditions.push(gte(rides.requestedAt, from));
    }
  }

  if (toDate) {
    const to = new Date(toDate);
    if (!isNaN(to.getTime())) {
      conditions.push(lte(rides.requestedAt, to));
    }
  }

  if (minEarnings != null) {
    const minMinor = Math.round(Number(minEarnings) * 100);
    conditions.push(
      or(
        and(sql`${rides.finalFareMinor} IS NOT NULL`, gte(rides.finalFareMinor, minMinor)),
        and(sql`${rides.finalFareMinor} IS NULL`, gte(rides.estimatedFareMinor, minMinor))
      )
    );
  }

  if (maxEarnings != null) {
    const maxMinor = Math.round(Number(maxEarnings) * 100);
    conditions.push(
      or(
        and(sql`${rides.finalFareMinor} IS NOT NULL`, lte(rides.finalFareMinor, maxMinor)),
        and(sql`${rides.finalFareMinor} IS NULL`, lte(rides.estimatedFareMinor, maxMinor))
      )
    );
  }

  const where = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(rides).where(where);
  const rawRows = await db.select({
    id: rides.id,
    riderId: rides.riderId,
    driverId: rides.driverId,
    vehicleTypeId: rides.vehicleTypeId,
    countryId: rides.countryId,
    currencyCode: rides.currencyCode,
    pickupLat: rides.pickupLat,
    pickupLng: rides.pickupLng,
    pickupAddress: rides.pickupAddress,
    dropLat: rides.dropLat,
    dropLng: rides.dropLng,
    dropAddress: rides.dropAddress,
    fareSnapshot: rides.fareSnapshot,
    estimatedFareMinor: rides.estimatedFareMinor,
    finalFareMinor: rides.finalFareMinor,
    distanceKm: rides.distanceKm,
    durationMin: rides.durationMin,
    actualDistanceKm: rides.actualDistanceKm,
    actualDurationMin: rides.actualDurationMin,
    polyline: rides.polyline,
    status: rides.status,
    isScheduled: rides.isScheduled,
    scheduledAt: rides.scheduledAt,
    driverArrivedAt: rides.driverArrivedAt,
    paymentMethod: rides.paymentMethod,
    paymentStatus: rides.paymentStatus,
    cancelledBy: rides.cancelledBy,
    cancelReason: rides.cancelReason,
    riderRating: rides.riderRating,
    driverRating: rides.driverRating,
    riderReview: rides.riderReview,
    driverReview: rides.driverReview,
    requestedAt: rides.requestedAt,
    acceptedAt: rides.acceptedAt,
    startedAt: rides.startedAt,
    completedAt: rides.completedAt,
    cancelledAt: rides.cancelledAt,
    riderName: users.name,
    riderPhone: users.phone,
    riderAvatar: users.avatar,
    riderRatingAverage: users.rating,
    vehicleTypeName: vehicleTypes.name,
    vehicleTypeIcon: vehicleTypes.icon,
  })
    .from(rides)
    .leftJoin(users, eq(rides.riderId, users.id))
    .leftJoin(vehicleTypes, eq(rides.vehicleTypeId, vehicleTypes.id))
    .where(where)
    .orderBy(desc(rides.requestedAt))
    .limit(limit)
    .offset(offset);

  const rows = rawRows.map((r) => {
    const fareMinor = r.finalFareMinor ?? r.estimatedFareMinor ?? 0;
    const fareMajor = fareMinor / 100;
    const distKm = r.actualDistanceKm ?? r.distanceKm ?? '0.0';
    const durMin = r.actualDurationMin ?? r.durationMin ?? 0;

    return {
      ...r,
      fare: fareMajor,
      fareMinor,
      pickup: r.pickupAddress,
      drop: r.dropAddress,
      distance: `${distKm} km`,
      time: `${durMin} min`,
      vehicle: r.vehicleTypeName || 'Ryva Cab',
      rider: {
        id: r.riderId,
        name: r.riderName || 'Rider',
        phone: r.riderPhone || '',
        avatar: r.riderAvatar || null,
        rating: r.riderRatingAverage || '5.0',
      },
    };
  });

  return { rows, pagination: paginate(page, limit, total) };
}

export async function listAllRides(filters, page, limit, offset) {
  const conditions = [];
  if (filters.status) conditions.push(eq(rides.status, filters.status));
  if (filters.driverId) conditions.push(eq(rides.driverId, filters.driverId));
  if (filters.riderId) conditions.push(eq(rides.riderId, filters.riderId));
  if (filters.countryId) conditions.push(eq(rides.countryId, filters.countryId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(rides).where(where);
  const rows = await db.select().from(rides).where(where)
    .orderBy(desc(rides.requestedAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

// Admin-initiated cancellation — support/ops use for stuck or disputed rides.
// Unlike the rider/driver cancel paths, this doesn't re-trigger matching; the ride
// simply ends, since an admin cancel usually means "stop this ride", not "find another driver".
export async function cancelRideByAdmin(rideId, adminId, reason) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  const cancellable = ['searching', 'accepted', 'arriving', 'started'];
  if (!cancellable.includes(ride.status)) {
    throw { statusCode: 409, message: `Cannot cancel a ride in status: ${ride.status}` };
  }

  const [updated] = await db.update(rides).set({
    status: 'cancelled',
    cancelledBy: 'admin',
    cancelReason: reason || 'Cancelled by admin',
    cancelledAt: new Date(),
  }).where(eq(rides.id, rideId)).returning();

  await recordStatusChange({
    rideId, fromStatus: ride.status, toStatus: 'cancelled',
    changedBy: 'admin', changedById: adminId, reason: reason || 'Cancelled by admin',
  });

  await redis.del(REDIS_KEYS.rideRequest(rideId));
  await cleanupRideTracking(rideId);

  if (ride.driverId) {
    await db.update(drivers).set({ isOnline: true }).where(eq(drivers.id, ride.driverId));
    await redis.del(REDIS_KEYS.driverRideActive(ride.driverId));
    await reAddToGeoIndexIfOnline(ride.driverId)
      .catch((err) => console.error('[Ride] reAddToGeoIndexIfOnline failed:', err.message));
    await publishEvent(TOPICS.NOTIF_PUSH, {
      userType: 'driver', userId: ride.driverId,
      type: 'RIDE_CANCELLED_BY_ADMIN',
      title: 'Ride Cancelled',
      body: `This ride was cancelled by support. Reason: ${reason || 'Not specified'}`,
    });
  }

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: ride.riderId,
    type: 'RIDE_CANCELLED_BY_ADMIN',
    title: 'Ride Cancelled',
    body: `Your ride was cancelled by support. Reason: ${reason || 'Not specified'}`,
  });

  await publishEvent(TOPICS.RIDE_CANCELLED, {
    id: rideId, rideId, riderId: ride.riderId, driverId: ride.driverId,
    cancelledBy: 'admin', reason,
  });
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'RIDE_CANCELLED_BY_ADMIN', entityType: 'ride', entityId: rideId,
    meta: { reason },
  });
  return updated;
}