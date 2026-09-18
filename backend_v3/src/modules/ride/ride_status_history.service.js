import { eq, asc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { rideStatusHistory } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

/**
 * Records one status transition. Call this immediately after every
 * successful ride.status UPDATE so the audit trail never drifts from reality.
 *
 * @param {object} params
 * @param {string} params.rideId
 * @param {string|null} params.fromStatus
 * @param {string} params.toStatus
 * @param {'rider'|'driver'|'system'|'admin'} params.changedBy
 * @param {string|null} [params.changedById]
 * @param {string|null} [params.reason]
 * @param {object|null} [params.meta]
 */
export async function recordStatusChange({ rideId, fromStatus, toStatus, changedBy, changedById = null, reason = null, meta = null }) {
    return db.insert(rideStatusHistory).values({
        rideId, fromStatus, toStatus, changedBy, changedById, reason, meta,
    }).returning();
}

/**
 * Full chronological history for a ride — used by rider/driver/admin to see
 * the timeline (e.g. "Driver cancelled, rematched, then completed").
 */
export async function getRideHistory(rideId) {
    return db.select().from(rideStatusHistory)
        .where(eq(rideStatusHistory.rideId, rideId))
        .orderBy(asc(rideStatusHistory.createdAt));
}

/**
 * Admin — paginated history across all rides, optionally filtered.
 */
export async function listHistoryPaginated(filters, page, limit, offset) {
    const conditions = [];
    if (filters.rideId) conditions.push(eq(rideStatusHistory.rideId, filters.rideId));
    const { and } = await import('drizzle-orm');
    const where = conditions.length ? and(...conditions) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(rideStatusHistory).where(where);
    const rows = await db.select().from(rideStatusHistory).where(where)
        .orderBy(asc(rideStatusHistory.createdAt)).limit(limit).offset(offset);
    return { rows, pagination: paginate(page, limit, total) };
}