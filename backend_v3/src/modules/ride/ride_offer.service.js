import { eq, and, inArray, asc, desc, count, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { rideOffers } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { releaseLocks } from '../matching/driver-lock.service.js';

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
 *
 * Also releases the per-driver offer lock (driver-lock.service.js) for the
 * winner and every superseded driver — this is the only correct place to do
 * so, since the matching ring loop never resumes after a win and can't release
 * the other candidates' locks itself. Releasing here (rather than waiting out
 * the lock TTL) lets the losing candidates become offerable again immediately.
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
    const superseded = await db.update(rideOffers).set({
        status: 'superseded',
        respondedAt: new Date(),
    }).where(and(
        eq(rideOffers.rideId, rideId),
        eq(rideOffers.status, 'pending'),
    )).returning();

    await releaseLocks(
        [driverId, ...superseded.map((o) => o.driverId)],
        rideId,
    ).catch((err) => console.error('[RideOffer] releaseLocks (accept) failed:', err.message));

    return accepted;
}

/**
 * Driver explicitly declines an offer (optional UX — "Decline" button).
 * Releases that driver's lock immediately so they're offerable again before
 * the ring's TTL expires.
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

    if (rejected) {
        await releaseLocks([driverId], rideId)
            .catch((err) => console.error('[RideOffer] releaseLocks (reject) failed:', err.message));
    }
    return rejected || null;
}

/**
 * Acceptance rate over a driver's offer history — used by scoring.service.js.
 * Cached in Redis (short TTL) since it's read on every ring for every candidate.
 * New drivers with too little history (<5 offers) get a neutral prior instead
 * of being penalized for having no track record yet.
 */
export async function getAcceptanceRate(driverId) {
    const cacheKey = REDIS_KEYS.driverAcceptanceRate(driverId);
    const cached = await redis.get(cacheKey);
    if (cached) return parseFloat(cached);

    const [row] = await db.select({
        total: count(),
        accepted: sql`count(*) filter (where ${rideOffers.status} = 'accepted')`,
    }).from(rideOffers).where(eq(rideOffers.driverId, driverId));

    const total = Number(row?.total ?? 0);
    const accepted = Number(row?.accepted ?? 0);
    const rate = total < 5 ? 0.8 : accepted / total;

    await redis.setex(cacheKey, 300, String(rate));
    return rate;
}

/**
 * Bulk-expires every still-pending offer for a ring (or all rings if ring is omitted)
 * once its timeout window passes or on ride cancellation.
 */
export async function expirePendingOffers(rideId, ring = null) {
    const conditions = [
        eq(rideOffers.rideId, rideId),
        eq(rideOffers.status, 'pending'),
    ];
    if (ring != null) {
        conditions.push(eq(rideOffers.ring, ring));
    }

    const expired = await db.update(rideOffers).set({
        status: 'expired',
        respondedAt: new Date(),
    }).where(and(...conditions)).returning();

    if (expired.length > 0) {
        const driverIds = expired.map((o) => o.driverId);
        await releaseLocks(driverIds, rideId).catch(() => {});
    }

    return expired;
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