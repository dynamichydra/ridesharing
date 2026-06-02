const db = require("../../db/drizzle");
const { trips } = require("../../db/schema/trips.schema");
const { tripOffers } = require("../../db/schema/trip-offer.schema");
const { tripStatusHistory } = require("../../db/schema/trip-status-history.schema");
const { driverProfiles } = require("../../db/schema/drivers.schema");
const { eq, and, ne, desc } = require("drizzle-orm");

class TripsRepository {
    // Read

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

    /**
     * Load a trip by primary key.
     * Returns undefined if not found.
     */
    static async findTripById(tripId, tx = db) {
        const [trip] = await tx
            .select()
            .from(trips)
            .where(eq(trips.id, tripId));
        return trip;
    }

    /**
     * Load a trip only when it matches both id AND status.
     * Used for optimistic-lock style checks (e.g. ensure still SEARCHING).
     */
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

    /**
     * Load a trip and verify it belongs to the given driverId.
     * Returns undefined when trip is not found or driver mismatch.
     */
    static async findTripByDriver(tripId, driverId, tx = db) {
        const [trip] = await tx
            .select()
            .from(trips)
            .where(
                and(
                    eq(trips.id, tripId),
                    eq(trips.driverId, driverId)
                )
            );
        return trip;
    }

    /**
     * Resolve the internal driver profile row for a given auth user id.
     */
    static async findDriverProfileByUserId(userId, tx = db) {
        const [driver] = await tx
            .select()
            .from(driverProfiles)
            .where(eq(driverProfiles.userId, userId));
        return driver;
    }

    /**
     * Find an active (PENDING) offer assigned to this driver for this trip.
     */
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

    // Write

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
            .set({
                ...updateData,
                updatedAt: new Date(),
            })
            .where(eq(trips.id, tripId))
            .returning();
        return updatedTrip;
    }

    static async updateTripWhenStatus(tripId, currentStatus, updateData, tx = db) {
        const [updatedTrip] = await tx
            .update(trips)
            .set({
                ...updateData,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(trips.id, tripId),
                    eq(trips.status, currentStatus)
                )
            )
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

    /**
     * Append an immutable row to the audit ledger.
     *
     * @param {string} tripId
     * @param {string} toStatus   - status being entered
     * @param {string|null} fromStatus - status being left (null for initial row)
     * @param {string|null} changedByUserId - auth user who triggered the transition
     * @param {object|null} metadata - arbitrary JSON payload (e.g. cancellation reason)
     * @param {object} tx - drizzle transaction context
     */
    static async createStatusHistory(
        tripId,
        toStatus,
        fromStatus = null,
        changedByUserId = null,
        metadata = null,
        tx = db
    ) {
        return tx
            .insert(tripStatusHistory)
            .values({
                tripId,
                status: toStatus,
                fromStatus,
                changedByUserId,
                metadata,
            });
    }

    // Transaction wrapper

    static async runTransaction(fn) {
        return db.transaction(fn);
    }
}

module.exports = TripsRepository;
