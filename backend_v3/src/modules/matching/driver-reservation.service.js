import { eq, and, or, sql, gte, lte } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { driverReservations } from '../../../drizzle/schema/index.js';
import { moment } from '../../utils/time.js';

/**
 * Driver Reservation Service for Scheduled Rides
 *
 * Reserves driver capacity for future bookings and checks for time conflicts.
 */

const DEFAULT_PRE_TRIP_BUFFER_MIN = 30; // Driver must be free 30 mins before scheduled pickup
const DEFAULT_POST_TRIP_BUFFER_MIN = 15; // 15 mins buffer after trip end

/**
 * Checks if a driver has an overlapping confirmed reservation.
 */
export async function isDriverReservedForTime(driverId, targetTime = new Date(), bufferMinutes = 45) {
  const checkTime = moment(targetTime).toDate();
  const bufferEnd = moment(targetTime).add(bufferMinutes, 'minutes').toDate();

  const [conflict] = await db
    .select({ id: driverReservations.id })
    .from(driverReservations)
    .where(
      and(
        eq(driverReservations.driverId, driverId),
        eq(driverReservations.status, 'confirmed'),
        sql`${driverReservations.windowStart} <= ${bufferEnd} AND ${driverReservations.windowEnd} >= ${checkTime}`
      )
    )
    .limit(1);

  return !!conflict;
}

/**
 * Creates a confirmed reservation for a scheduled ride.
 */
export async function createDriverReservation({
  driverId,
  rideId,
  scheduledAt,
  estimatedDurationMin = 30,
}) {
  const pickupTime = moment(scheduledAt);
  const windowStart = pickupTime.clone().subtract(DEFAULT_PRE_TRIP_BUFFER_MIN, 'minutes').toDate();
  const windowEnd = pickupTime.clone().add(estimatedDurationMin + DEFAULT_POST_TRIP_BUFFER_MIN, 'minutes').toDate();

  const [reservation] = await db
    .insert(driverReservations)
    .values({
      driverId,
      rideId,
      windowStart,
      windowEnd,
      status: 'confirmed',
      reservedAt: new Date(),
    })
    .returning();

  return reservation;
}

/**
 * Releases a driver reservation.
 */
export async function releaseDriverReservation(rideId, driverId = null, reason = 'ride_completed') {
  const conditions = [
    eq(driverReservations.rideId, rideId),
    eq(driverReservations.status, 'confirmed'),
  ];
  if (driverId) {
    conditions.push(eq(driverReservations.driverId, driverId));
  }

  const [released] = await db
    .update(driverReservations)
    .set({
      status: 'released',
      releasedAt: new Date(),
      releaseReason: reason,
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning();

  return released;
}
