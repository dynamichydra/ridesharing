import { eq, and, inArray, asc, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { rideOffers } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

/**
 * Creates one `pending` ride_offer row per candidate driver for a given ring.
 * Called by the matching engine right before it broadcasts ride:new_request.
 *
 * @param {string} rideId
 * @param {Array<{driverId, distanceKm, rating, score}>} candidates  — scored candidates from this ring
 * @param {number} ring
 * @param {number} radiusKm
 * @param {Date}   expiresAt
 */
export async function createOffersForRing(rideId, candidates, ring, radiusKm, expiresAt) {
    if (!candidates.length) return [];

    const rows = candidates.map((c) => ({
        rideId,
        driverId: c.driverId,
        status: 'pending',
        ring,
        radiusKm: String(radiusKm),
        distanceKm: String(c.distanceKm),
        driverRatingAtOffer: String(c.rating),
        score: String(c._score ?? c.score ?? 0),
        expiresAt,
    }));

    return db.insert(rideOffers).values(rows).returning();
}

/**
 * Marks one specific driver's offer as accepted, and atomically supersedes
 * every other pending offer for the same ride (across all rings).
 *
 * Returns the accepted offer row, or null if the offer was no longer pending
 * (already accepted by someone else / expired) — caller should treat that
 * as a race-condition failure.
 */
export async function acceptOffer(rideId, driverId) {
    // Atomic: only succeeds if this exact offer is still pending
    const [accepted] = await db.update(rideOffers).set({
        status: 'accepted',
        respondedAt: new Date(),
    }).where(and(
        eq(rideOffers.rideId, rideId),
        eq(rideOffers.driverId, driverId),
        eq(rideOffers.status, 'pending'),
    )).returning();

    if (!accepted) return null; // offer expired or already responded to

    // Supersede every other pending offer for this ride (any ring, any driver)
    await db.update(rideOffers).set({
        status: 'superseded',
        respondedAt: new Date(),
    }).where(and(
        eq(rideOffers.rideId, rideId),
        eq(rideOffers.status, 'pending'),
    ));

    return accepted;
}

/**
 * Driver explicitly declines an offer (optional UX — "Decline" button).
 */
export async function rejectOffer(rideId, driverId, reason) {
    const [rejected] = await db.update(rideOffers).set({
        status: 'rejected',
        respondedAt: new Date(),
        rejectReason: reason || null,
    }).where(and(
        eq(rideOffers.rideId, rideId),
        eq(rideOffers.driverId, driverId),
        eq(rideOffers.status, 'pending'),
    )).returning();
    return rejected || null;
}

/**
 * Bulk-expires every still-pending offer for a ring once its timeout window
 * passes without any driver accepting. Called by the matching engine right
 * before it moves to the next ring (or expires the ride entirely).
 */
export async function expirePendingOffers(rideId, ring) {
    return db.update(rideOffers).set({
        status: 'expired',
        respondedAt: new Date(),
    }).where(and(
        eq(rideOffers.rideId, rideId),
        eq(rideOffers.ring, ring),
        eq(rideOffers.status, 'pending'),
    )).returning();
}

/**
 * All offers for a ride — used to render the full broadcast history
 * ("12 drivers were offered this ride across 3 rings").
 */
export async function getOffersForRide(rideId) {
    return db.select().from(rideOffers)
        .where(eq(rideOffers.rideId, rideId))
        .orderBy(asc(rideOffers.ring), desc(rideOffers.score));
}

/**
 * A driver's own offer history (their "ride requests" inbox / past offers).
 */
export async function getDriverOffers(driverId, page, limit, offset, statusFilter) {
    const conditions = [eq(rideOffers.driverId, driverId)];
    if (statusFilter) conditions.push(eq(rideOffers.status, statusFilter));

    const [{ total }] = await db.select({ total: count() }).from(rideOffers)
        .where(and(...conditions));
    const rows = await db.select().from(rideOffers)
        .where(and(...conditions))
        .orderBy(desc(rideOffers.offeredAt)).limit(limit).offset(offset);
    return { rows, pagination: paginate(page, limit, total) };
}

/**
 * Validates a driver actually holds a pending offer for this ride before
 * letting them accept — replaces the old Redis-only candidate check with
 * a durable DB-backed check (Redis is still used for the fast-path TTL).
 */
export async function hasPendingOffer(rideId, driverId) {
    const [offer] = await db.select({ id: rideOffers.id }).from(rideOffers)
        .where(and(
            eq(rideOffers.rideId, rideId),
            eq(rideOffers.driverId, driverId),
            eq(rideOffers.status, 'pending'),
        )).limit(1);
    return !!offer;
}