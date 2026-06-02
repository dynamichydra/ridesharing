const db = require("../../db/drizzle");
const { driverProfiles } = require("../../db/schema/drivers.schema");
const { driverLocations } = require("../../db/schema/driver-location.schema");
const { users } = require("../../db/schema/users.schema");
const { trips } = require("../../db/schema/trips.schema");
const { tripOffers } = require("../../db/schema/trip-offer.schema");
const { eq, and, inArray } = require("drizzle-orm");

class DriversRepository {
    static async findByUserId(userId, tx = db) {
        const [driver] = await tx
            .select()
            .from(driverProfiles)
            .where(eq(driverProfiles.userId, userId));
        return driver;
    }

    static async findById(driverId, tx = db) {
        const [driver] = await tx
            .select()
            .from(driverProfiles)
            .where(eq(driverProfiles.id, driverId));
        return driver;
    }

    static async createDriverProfile(driverData, tx = db) {
        const [driver] = await tx
            .insert(driverProfiles)
            .values({
                userId: driverData.userId,
                licenseNumber: driverData.licenseNumber,
                vehicleType: driverData.vehicleType,
                vehicleNumber: driverData.vehicleNumber,
            })
            .returning();
        return driver;
    }

    static async updateUserRole(userId, role, tx = db) {
        return tx
            .update(users)
            .set({ role })
            .where(eq(users.id, userId));
    }

    static async updateDriverStatusByIdWhenStatus(driverId, currentStatus, nextStatus, tx = db) {
        const [driver] = await tx
            .update(driverProfiles)
            .set({
                status: nextStatus,
                lastActiveAt: new Date(),
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(driverProfiles.id, driverId),
                    eq(driverProfiles.status, currentStatus)
                )
            )
            .returning();
        return driver;
    }

    static async upsertDriverLocation(driverId, latitude, longitude, tx = db) {
        return tx
            .insert(driverLocations)
            .values({
                driverId,
                latitude: latitude.toString(),
                longitude: longitude.toString(),
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: driverLocations.driverId,
                set: {
                    latitude: latitude.toString(),
                    longitude: longitude.toString(),
                    updatedAt: new Date(),
                },
            });
    }

    static async findActiveTrip(driverId, allowedStatuses, tx = db) {
        const [activeTrip] = await tx
            .select()
            .from(trips)
            .where(
                and(
                    eq(trips.driverId, driverId),
                    inArray(trips.status, allowedStatuses)
                )
            );
        return activeTrip;
    }

    static async getPendingOffers(driverId, tx = db) {
        return tx
            .select({
                offerId: tripOffers.id,
                tripId: trips.id,
                pickupAddress: trips.pickupAddress,
                destinationAddress: trips.destinationAddress,
                estimatedFare: trips.estimatedFare,
                distanceKm: trips.distanceKm,
                status: tripOffers.status,
                requestedAt: trips.requestedAt,
            })
            .from(tripOffers)
            .innerJoin(trips, eq(tripOffers.tripId, trips.id))
            .where(
                and(
                    eq(tripOffers.driverId, driverId),
                    eq(tripOffers.status, "PENDING")
                )
            );
    }

    static async findOnlineDriversWithLocations(tx = db) {
        return tx
            .select({
                driverId: driverProfiles.id,
                userId: driverProfiles.userId,
                latitude: driverLocations.latitude,
                longitude: driverLocations.longitude,
                rating: driverProfiles.rating,
            })
            .from(driverProfiles)
            .innerJoin(driverLocations, eq(driverProfiles.id, driverLocations.driverId))
            .where(eq(driverProfiles.status, "ONLINE"));
    }
}

module.exports = DriversRepository;
