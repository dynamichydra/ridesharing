import { eq, and, inArray, desc, count, ne } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { rideDisputes, rides, payments } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { publishNotification } from '../notification/notification-events.js';
import { paginate } from '../../utils/response.js';

const OPEN_STATUSES = ['open', 'responded'];

// Resolves which side of a ride the caller is on — throws if they're neither the rider nor
// the driver on that ride. Shared by raise/respond so both check ride ownership the same way.
async function _loadRideForParticipant(rideId, user) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  if (user.role === 'rider' && ride.riderId === user.id) return { ride, side: 'rider' };
  if (user.role === 'driver' && ride.driverId === user.id) return { ride, side: 'driver' };
  throw { statusCode: 403, message: 'Not your ride' };
}

// ── Raise ─────────────────────────────────────────────────────────────────────────

export async function raiseDispute(user, { rideId, reason, description }) {
  if (!rideId) throw { statusCode: 400, message: 'rideId is required' };
  if (!reason) throw { statusCode: 400, message: 'reason is required' };
  if (!description) throw { statusCode: 400, message: 'description is required' };

  const { ride, side } = await _loadRideForParticipant(rideId, user);

  const [existing] = await db.select().from(rideDisputes)
    .where(and(eq(rideDisputes.rideId, rideId), eq(rideDisputes.raisedById, user.id), inArray(rideDisputes.status, OPEN_STATUSES)))
    .limit(1);
  if (existing) throw { statusCode: 409, message: 'You already have an open dispute on this ride' };

  const [payment] = await db.select().from(payments)
    .where(eq(payments.rideId, rideId)).orderBy(desc(payments.createdAt)).limit(1);

  const [disputeRow] = await db.insert(rideDisputes).values({
    rideId, paymentId: payment?.id ?? null,
    raisedByType: side, raisedById: user.id,
    reason, description,
  }).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: user.id, actorType: side, action: 'RIDE_DISPUTE_RAISED',
    entityType: 'ride_dispute', entityId: disputeRow.id,
    meta: { rideId, reason },
  });

  // Notify the *other* party on the ride — they're the one who needs to respond.
  const otherPartyId = side === 'rider' ? ride.driverId : ride.riderId;
  const otherPartyType = side === 'rider' ? 'driver' : 'rider';
  if (otherPartyId) {
    await publishNotification('RIDE_DISPUTE_RAISED', {
      userId: otherPartyId, userType: otherPartyType,
      variables: { rideId, reason },
    });
  }

  return disputeRow;
}

// ── Respond ───────────────────────────────────────────────────────────────────────

// Only the *other* party on the ride can respond — the raiser adding more context would just
// be editing their own complaint, which isn't supported here (they can raise a new one).
export async function respondToDispute(user, disputeId, responseText) {
  if (!responseText) throw { statusCode: 400, message: 'responseText is required' };

  const [disputeRow] = await db.select().from(rideDisputes).where(eq(rideDisputes.id, disputeId)).limit(1);
  if (!disputeRow) throw { statusCode: 404, message: 'Dispute not found' };

  const { side } = await _loadRideForParticipant(disputeRow.rideId, user);
  if (disputeRow.raisedById === user.id) throw { statusCode: 403, message: 'You cannot respond to your own dispute' };
  if (disputeRow.status !== 'open') throw { statusCode: 409, message: `Dispute is already '${disputeRow.status}'` };

  const [updated] = await db.update(rideDisputes)
    .set({
      responseText, respondedByType: side, respondedById: user.id, respondedAt: new Date(),
      status: 'responded', updatedAt: new Date(),
    })
    .where(eq(rideDisputes.id, disputeId)).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: user.id, actorType: side, action: 'RIDE_DISPUTE_RESPONDED',
    entityType: 'ride_dispute', entityId: disputeRow.id,
    meta: { rideId: disputeRow.rideId },
  });
  await publishNotification('RIDE_DISPUTE_RESPONDED', {
    userId: disputeRow.raisedById, userType: disputeRow.raisedByType,
    variables: { rideId: disputeRow.rideId },
  });

  return updated;
}

// ── Reads — rider/driver own, or admin any ───────────────────────────────────────

export async function getMyRideDisputes(user, page, limit, offset) {
  const rideOwnerCondition = user.role === 'driver' ? eq(rides.driverId, user.id) : eq(rides.riderId, user.id);

  const [{ total }] = await db.select({ total: count() }).from(rideDisputes)
    .innerJoin(rides, eq(rideDisputes.rideId, rides.id)).where(rideOwnerCondition);
  const rows = await db.select({ dispute: rideDisputes })
    .from(rideDisputes)
    .innerJoin(rides, eq(rideDisputes.rideId, rides.id))
    .where(rideOwnerCondition)
    .orderBy(desc(rideDisputes.createdAt)).limit(limit).offset(offset);
  return { rows: rows.map((r) => r.dispute), pagination: paginate(page, limit, total) };
}

export async function getRideDispute(id, user) {
  const [disputeRow] = await db.select().from(rideDisputes).where(eq(rideDisputes.id, id)).limit(1);
  if (!disputeRow) throw { statusCode: 404, message: 'Dispute not found' };

  if (user.role === 'admin' || user.role === 'super_admin') return disputeRow;
  await _loadRideForParticipant(disputeRow.rideId, user); // throws 403 if not a participant
  return disputeRow;
}

// ── Admin ─────────────────────────────────────────────────────────────────────────

export async function listRideDisputes(filters, page, limit, offset) {
  const conditions = [];
  if (filters.status) conditions.push(eq(rideDisputes.status, filters.status));
  if (filters.rideId) conditions.push(eq(rideDisputes.rideId, filters.rideId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(rideDisputes).where(where);
  const rows = await db.select().from(rideDisputes).where(where)
    .orderBy(desc(rideDisputes.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

// Admin triage — resolves or rejects an open/responded ticket. This never touches the
// ledger/refund/wallet machinery itself; an admin who agrees with a complaint acts through
// the existing refund-request-approval or wallet-adjust endpoints separately.
export async function resolveRideDispute(id, adminId, { status, adminNotes }) {
  if (!['resolved', 'rejected'].includes(status)) {
    throw { statusCode: 400, message: "status must be 'resolved' or 'rejected'" };
  }

  const [updated] = await db.update(rideDisputes)
    .set({ status, adminNotes, resolvedById: adminId, resolvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(rideDisputes.id, id), ne(rideDisputes.status, 'resolved'), ne(rideDisputes.status, 'rejected')))
    .returning();
  if (!updated) throw { statusCode: 409, message: 'Dispute not found or already closed' };

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin', action: status === 'resolved' ? 'RIDE_DISPUTE_RESOLVED' : 'RIDE_DISPUTE_REJECTED',
    entityType: 'ride_dispute', entityId: updated.id,
    meta: { rideId: updated.rideId },
  });

  await publishNotification('RIDE_DISPUTE_RESOLVED', {
    userId: updated.raisedById, userType: updated.raisedByType, variables: { status },
  });
  if (updated.respondedById) {
    await publishNotification('RIDE_DISPUTE_RESOLVED', {
      userId: updated.respondedById, userType: updated.respondedByType, variables: { status },
    });
  }

  return updated;
}
