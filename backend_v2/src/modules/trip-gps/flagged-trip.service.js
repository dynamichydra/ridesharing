import { eq, and, count, desc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { flaggedTrips, rides } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

// Joined with the ride so admin reads carry pickup/drop + currency instead of a bare rideId —
// flaggedTrips itself stores no currency (a fare deviation is only meaningful next to its ride).
function _selectWithRide() {
  return db.select({
    id: flaggedTrips.id, rideId: flaggedTrips.rideId,
    riderId: rides.riderId, driverId: rides.driverId,
    pickupAddress: rides.pickupAddress, dropAddress: rides.dropAddress, currencyCode: rides.currencyCode,
    reason: flaggedTrips.reason, estimatedFareMinor: flaggedTrips.estimatedFareMinor,
    actualFareMinor: flaggedTrips.actualFareMinor, deviationPct: flaggedTrips.deviationPct,
    status: flaggedTrips.status, adjustedFareMinor: flaggedTrips.adjustedFareMinor,
    reviewNote: flaggedTrips.reviewNote, reviewedBy: flaggedTrips.reviewedBy, reviewedAt: flaggedTrips.reviewedAt,
    createdAt: flaggedTrips.createdAt,
  }).from(flaggedTrips).innerJoin(rides, eq(flaggedTrips.rideId, rides.id));
}

export async function list(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(flaggedTrips.status, filters.status));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(flaggedTrips).where(where);
  const rows = await _selectWithRide().where(where)
    .orderBy(desc(flaggedTrips.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function getById(id) {
  const [row] = await _selectWithRide().where(eq(flaggedTrips.id, id)).limit(1);
  if (!row) throw { statusCode: 404, message: 'Flagged trip not found' };
  return row;
}

/** Bills the GPS-recomputed actual fare — admin confirms the deviation is legitimate. */
export async function approve(id, adminId, note) {
  const flagged = await getById(id);
  if (flagged.status !== 'pending_review') throw { statusCode: 409, message: `Already ${flagged.status}` };

  await db.update(rides).set({ finalFareMinor: flagged.actualFareMinor }).where(eq(rides.id, flagged.rideId));
  const [row] = await db.update(flaggedTrips).set({
    status: 'approved', reviewNote: note || null, reviewedBy: adminId, reviewedAt: new Date(),
  }).where(eq(flaggedTrips.id, id)).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin', action: 'FLAGGED_TRIP_APPROVED',
    entityType: 'flagged_trip', entityId: id, meta: { rideId: flagged.rideId, actualFareMinor: flagged.actualFareMinor },
  });
  return row;
}

/** Bills a manually-set amount instead of either the estimate or the raw actual. */
export async function adjust(id, adjustedFareMinor, adminId, note) {
  const flagged = await getById(id);
  if (flagged.status !== 'pending_review') throw { statusCode: 409, message: `Already ${flagged.status}` };

  await db.update(rides).set({ finalFareMinor: adjustedFareMinor }).where(eq(rides.id, flagged.rideId));
  const [row] = await db.update(flaggedTrips).set({
    status: 'adjusted', adjustedFareMinor, reviewNote: note || null, reviewedBy: adminId, reviewedAt: new Date(),
  }).where(eq(flaggedTrips.id, id)).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin', action: 'FLAGGED_TRIP_ADJUSTED',
    entityType: 'flagged_trip', entityId: id, meta: { rideId: flagged.rideId, adjustedFareMinor },
  });
  return row;
}
