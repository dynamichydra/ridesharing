const db = require("../../db/drizzle");
const { trips } = require("../../db/schema/trips.schema");
const { tripOffers } = require("../../db/schema/trip-offer.schema");
const { tripStatusHistory } = require("../../db/schema/trip-status-history.schema");
const { driverProfiles } = require("../../db/schema/drivers.schema");
const { eq, and, ne, desc } = require("drizzle-orm");

class TripsRepository {
    static async findByRiderId(riderId, tx = db) {
        return tx
            .select()
            .from(trips)
            .where(eq(trips.riderId, riderId))
            .orderBy(desc(trips.createdAt));
    }

    static async findPendingTrips(tx = db) {
        return tx
            .select()
            .from(trips)
            .where(eq(trips.status, "SEARCHING"))
            .orderBy(desc(trips.createdAt));
    }

    static async findDriverProfileByUserId(userId, tx = db) {
        const [driver] = await tx
            .select()
            .from(driverProfiles)
            .where(eq(driverProfiles.userId, userId));
        return driver;
    }

    static async findTripById(tripId, tx = db) {
        const [trip] = await tx
            .select()
            .from(trips)
            .where(eq(trips.id, tripId));
        return trip;
    }

    static async findOfferForDriver(tripId, driverId, tx = db) {
        const [offer] = await tx
            .select()
            .from(tripOffers)
            .where(
                and(
                    eq(tripOffers.tripId, tripId),
                    eq(tripOffers.driverId, driverId),
                    eq(tripOffers.status, "PENDING")
                )
            );
        return offer;
    }

    static async findTripByIdAndStatus(tripId, status, tx = db) {
        const [trip] = await tx
            .select()
            .from(trips)
            .where(
                and(
                    eq(trips.id, tripId),
                    eq(trips.status, status)
                )
            );
        return trip;
    }

    static async createTrip(tripData, tx = db) {
        const [trip] = await tx
            .insert(trips)
            .values(tripData)
            .returning();
        return trip;
    }

    static async createOffers(offersArray, tx = db) {
        return tx
            .insert(tripOffers)
            .values(offersArray);
    }

    static async updateTrip(tripId, updateData, tx = db) {
        const [updatedTrip] = await tx
            .update(trips)
            .set(updateData)
            .where(eq(trips.id, tripId))
            .returning();
        return updatedTrip;
    }

    static async updateOfferStatus(offerId, status, tx = db) {
        return tx
            .update(tripOffers)
            .set({ status })
            .where(eq(tripOffers.id, offerId));
    }

    static async expireOtherOffers(tripId, winnerOfferId, tx = db) {
        return tx
            .update(tripOffers)
            .set({ status: "EXPIRED" })
            .where(
                and(
                    eq(tripOffers.tripId, tripId),
                    ne(tripOffers.id, winnerOfferId)
                )
            );
    }

    static async createStatusHistory(tripId, status, tx = db) {
        return tx
            .insert(tripStatusHistory)
            .values({
                tripId,
                status,
            });
    }

    // Wrap transactional operations inside standard Drizzle transaction block
    static async runTransaction(fn) {
        return db.transaction(fn);
    }
}

module.exports = TripsRepository;
