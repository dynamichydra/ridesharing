import { eq, and, gte, sql, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  drivers, rides, rideOffers, driverEarnings,
} from '../../../drizzle/schema/index.js';

export async function getDriverPerformanceMetrics(driverId, { period = 'all' } = {}) {
  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!driver) throw { statusCode: 404, message: 'Driver not found' };

  let startDate = null;
  const now = new Date();
  if (period === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }

  // 1. Offer & Acceptance Statistics
  const offersQuery = db.select({
    status: rideOffers.status,
    total: count(rideOffers.id),
  }).from(rideOffers)
    .where(and(
      eq(rideOffers.driverId, driverId),
      startDate ? gte(rideOffers.offeredAt, startDate) : undefined,
    ))
    .groupBy(rideOffers.status);

  const offerCounts = await offersQuery;
  let totalOffers = 0;
  let acceptedOffers = 0;
  let declinedOffers = 0;
  let expiredOffers = 0;

  for (const o of offerCounts) {
    const c = Number(o.total);
    totalOffers += c;
    if (o.status === 'accepted') acceptedOffers += c;
    else if (o.status === 'declined') declinedOffers += c;
    else if (o.status === 'expired') expiredOffers += c;
  }

  const acceptanceRate = totalOffers > 0
    ? Math.round((acceptedOffers / totalOffers) * 1000) / 10
    : 100.0;

  // 2. Cancellation & Completion Statistics
  const ridesQuery = db.select({
    status: rides.status,
    cancelledBy: rides.cancelledBy,
    total: count(rides.id),
  }).from(rides)
    .where(and(
      eq(rides.driverId, driverId),
      startDate ? gte(rides.requestedAt, startDate) : undefined,
    ))
    .groupBy(rides.status, rides.cancelledBy);

  const rideCounts = await ridesQuery;
  let completedRides = 0;
  let driverCancelledRides = 0;
  let riderCancelledRides = 0;
  let otherCancelledRides = 0;

  for (const r of rideCounts) {
    const c = Number(r.total);
    if (r.status === 'completed') {
      completedRides += c;
    } else if (r.status === 'cancelled') {
      if (r.cancelledBy === 'driver') driverCancelledRides += c;
      else if (r.cancelledBy === 'rider') riderCancelledRides += c;
      else otherCancelledRides += c;
    }
  }

  const totalAssignedRides = completedRides + driverCancelledRides + riderCancelledRides + otherCancelledRides;

  const cancellationRate = totalAssignedRides > 0
    ? Math.round((driverCancelledRides / totalAssignedRides) * 1000) / 10
    : 0.0;

  const completionRate = totalAssignedRides > 0
    ? Math.round((completedRides / totalAssignedRides) * 1000) / 10
    : 100.0;

  // 3. Earnings Summary
  const earningsQuery = await db.select({
    netEarningsMinor: sql`COALESCE(SUM(${driverEarnings.netEarningMinor}), 0)::bigint`,
    tipsMinor: sql`COALESCE(SUM(${driverEarnings.tipMinor}), 0)::bigint`,
    totalTrips: sql`COUNT(${driverEarnings.id})::int`,
  }).from(driverEarnings)
    .where(and(
      eq(driverEarnings.driverId, driverId),
      startDate ? gte(driverEarnings.createdAt, startDate) : undefined,
    ));

  const earnings = earningsQuery[0] || { netEarningsMinor: 0, tipsMinor: 0, totalTrips: 0 };

  return {
    driverId,
    name: driver.name,
    period,
    rating: parseFloat(driver.rating || '5.0'),
    totalRides: driver.totalRides || completedRides,
    metrics: {
      totalOffers,
      acceptedOffers,
      declinedOffers,
      expiredOffers,
      acceptanceRate, // percentage (e.g. 95.5)
      totalAssignedRides,
      completedRides,
      driverCancelledRides,
      cancellationRate, // percentage (e.g. 2.1)
      completionRate, // percentage (e.g. 97.9)
    },
    earnings: {
      netEarningsMinor: Number(earnings.netEarningsMinor),
      tipsMinor: Number(earnings.tipsMinor),
      totalEarningsMinor: Number(earnings.netEarningsMinor) + Number(earnings.tipsMinor),
      totalTripsRecorded: Number(earnings.totalTrips),
    },
    status: {
      isOnline: driver.isOnline,
      approvalStatus: driver.approvalStatus,
      isBlocked: driver.isBlocked,
    },
  };
}
