const db = require("../../db/drizzle");
const { eq, inArray, and } = require("drizzle-orm");
const { trips } = require("../../db/schema/trips.schema");
const { tripOffers } = require("../../db/schema/trip-offer.schema");
const { driverProfiles } = require("../../db/schema/drivers.schema");

class MatchingRepository {
    
    /**
     * Get a trip safely, without modifying it.
     */
    static async getTrip(tripId) {
        const result = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
        return result[0];
    }

    /**
     * Fetch a fresh offer by trip and driver.
     */
    static async getOffer(tripId, driverId) {
        const result = await db.select()
            .from(tripOffers)
            .where(
                and(
                    eq(tripOffers.tripId, tripId),
                    eq(tripOffers.driverId, driverId)
                )
            )
            .limit(1);
        return result[0];
    }

    /**
     * Atomic simulated distributed lock via trip.driverId
     * We attempt to set driverId only if it is null and status is SEARCHING.
     * This prevents multiple drivers from accepting the same trip.
     */
    static async lockTripForDriver(tripId, driverId) {
        // Since we are mocking redis locks, we can just use an atomic DB update.
        // In a real system, you'd do SETNX in Redis.
        // Drizzle doesn't support raw 'WHERE status = X AND driver_id IS NULL' easily via update wrapper, 
        // but we can simulate it by attempting to update and checking rows affected, or using transaction.
        return db.transaction(async (tx) => {
            const tripResult = await tx.select().from(trips).where(eq(trips.id, tripId)).for('update');
            if (!tripResult.length) return false;

            const trip = tripResult[0];
            if (trip.status !== "SEARCHING" || trip.driverId !== null) {
                return false; // Trip already taken or cancelled
            }

            // Lock it by assigning the driver ID (though status is still SEARCHING temporarily)
            await tx.update(trips)
                .set({ driverId: driverId, updatedAt: new Date() })
                .where(eq(trips.id, tripId));

            return true;
        });
    }

    /**
     * Set a trip offer to EXPIRED if it wasn't accepted.
     */
    static async expireOffer(tripId, driverId) {
        await db.update(tripOffers)
            .set({ status: "EXPIRED" })
            .where(
                and(
                    eq(tripOffers.tripId, tripId),
                    eq(tripOffers.driverId, driverId),
                    eq(tripOffers.status, "PENDING")
                )
            );
    }
}

module.exports = MatchingRepository;
