const db =
    require("../../db");

const {
    trips,
} = require(
    "../../db/schema/trips.schema"
);

const fareService =
    require(
        "./fare.service"
    );

const {
    eq,
    desc,
    and,
    isNull,
    ne,
} = require(
    "drizzle-orm"
);
const matchingService =
    require(
        "../matching/matching.service"
    );
const { tripOffers } = require("../../db/schema/trip-offer.schema");
const { driverProfiles } = require("../../db/schema/drivers.schema");
const { tripStatusHistory } = require("../../db/schema/trip-status-history.schema");
const { ALLOWED_TRANSITIONS } = require("./trip.constants");

const getMyTrips =
    async (
        riderId
    ) => {
        return db
            .select()
            .from(trips)
            .where(
                eq(
                    trips.riderId,
                    riderId
                )
            )
            .orderBy(
                desc(
                    trips.createdAt
                )
            );
    };

const getPendingTrips =
    async () => {
        return db
            .select()
            .from(trips)
            .where(
                eq(
                    trips.status,
                    "SEARCHING"
                )
            )
            .orderBy(
                desc(
                    trips.createdAt
                )
            );
    };
const acceptRide =
    async (
        userId,
        tripId
    ) => {
        return db.transaction(
            async (tx) => {
                // Get driver profile
                const [driver] =
                    await tx
                        .select()
                        .from(
                            driverProfiles
                        )
                        .where(
                            eq(
                                driverProfiles.userId,
                                userId
                            )
                        );

                if (
                    !driver
                ) {
                    throw new Error(
                        "Driver not found"
                    );
                }

                // Validate offer exists
                const [offer] =
                    await tx
                        .select()
                        .from(
                            tripOffers
                        )
                        .where(
                            and(
                                eq(
                                    tripOffers.tripId,
                                    tripId
                                ),

                                eq(
                                    tripOffers.driverId,
                                    driver.id
                                ),

                                eq(
                                    tripOffers.status,
                                    "PENDING"
                                )
                            )
                        );

                if (
                    !offer
                ) {
                    throw new Error(
                        "Trip unavailable"
                    );
                }

                // Check trip still available
                const [trip] =
                    await tx
                        .select()
                        .from(
                            trips
                        )
                        .where(
                            and(
                                eq(
                                    trips.id,
                                    tripId
                                ),

                                eq(
                                    trips.status,
                                    "SEARCHING"
                                )
                            )
                        );

                if (
                    !trip
                ) {
                    throw new Error(
                        "Trip already accepted"
                    );
                }

                // Accept trip
                const [
                    updatedTrip,
                ] =
                    await tx
                        .update(
                            trips
                        )
                        .set({
                            driverId:
                                driver.id,

                            status:
                                "ACCEPTED",

                            acceptedAt:
                                new Date(),
                        })
                        .where(
                            eq(
                                trips.id,
                                tripId
                            )
                        )
                        .returning();

                // Winner offer
                await tx
                    .update(
                        tripOffers
                    )
                    .set({
                        status:
                            "ACCEPTED",
                    })
                    .where(
                        eq(
                            tripOffers.id,
                            offer.id
                        )
                    );

                // Expire other offers
                await tx
                    .update(
                        tripOffers
                    )
                    .set({
                        status:
                            "EXPIRED",
                    })
                    .where(
                        and(
                            eq(
                                tripOffers.tripId,
                                tripId
                            ),

                            ne(
                                tripOffers.id,
                                offer.id
                            )
                        )
                    );

                return updatedTrip;
            }
        );
    };
const driverArrived =
    async (tripId) => {
        const [trip] =
            await db
                .update(trips)
                .set({
                    status:
                        "DRIVER_ARRIVING",
                })
                .where(
                    and(
                        eq(
                            trips.id,
                            tripId
                        ),

                        eq(
                            trips.status,
                            "DRIVER_ASSIGNED"
                        )
                    )
                )
                .returning();

        if (!trip) {
            throw new Error(
                "Invalid trip state"
            );
        }

        return trip;
    };
const startTrip =
    async (tripId) => {
        const [trip] =
            await db
                .update(trips)
                .set({
                    status:
                        "STARTED",

                    startedAt:
                        new Date(),
                })
                .where(
                    and(
                        eq(
                            trips.id,
                            tripId
                        ),

                        eq(
                            trips.status,
                            "DRIVER_ARRIVING"
                        )
                    )
                )
                .returning();

        if (!trip) {
            throw new Error(
                "Trip can't start"
            );
        }

        return trip;
    };

const completeTrip =
    async (tripId) => {
        const [trip] =
            await db
                .update(trips)
                .set({
                    status:
                        "COMPLETED",

                    completedAt:
                        new Date(),
                })
                .where(
                    and(
                        eq(
                            trips.id,
                            tripId
                        ),

                        eq(
                            trips.status,
                            "STARTED"
                        )
                    )
                )
                .returning();

        if (!trip) {
            throw new Error(
                "Trip can't complete"
            );
        }

        return trip;
    };

const requestRide =
    async (
        riderId,
        payload
    ) => {
        const fareInfo =
            await fareService.estimateFare(
                payload.pickupLat,
                payload.pickupLng,
                payload.destinationLat,
                payload.destinationLng
            );
            console.log(fareInfo);
            
        const selectedFare =
            fareInfo.fares.find(
                (
                    item
                ) =>
                    item.vehicleType ===
                    payload.vehicleType
            );

        if (
            !selectedFare
        ) {
            throw new Error(
                "Invalid vehicle type"
            );
        }
        const [trip] =
            await db
                .insert(trips)
                .values({
                    riderId,

                    pickupAddress:
                        payload.pickupAddress,

                    pickupLat:
                        payload.pickupLat,

                    pickupLng:
                        payload.pickupLng,

                    destinationAddress:
                        payload.destinationAddress,

                    destinationLat:
                        payload.destinationLat,

                    destinationLng:
                        payload.destinationLng,

                    estimatedFare:
                        fareInfo.estimatedFare,

                    distanceKm:
                        fareInfo.distanceKm,

                    estimatedDuration:
                        fareInfo.estimatedDuration,

                    estimatedFare:
                        selectedFare.estimatedFare,
                    status:
                        "SEARCHING",
                })
                .returning();

        const nearbyDrivers =
            await matchingService.findNearbyDrivers(
                payload.pickupLat,
                payload.pickupLng
            );

        if (
            nearbyDrivers.length
        ) {
            await db
                .insert(
                    tripOffers
                )
                .values(
                    nearbyDrivers.map(
                        (
                            driver
                        ) => ({
                            tripId:
                                trip.id,

                            driverId:
                                driver.driverId,

                            status:
                                "PENDING",
                        })
                    )
                );
        }

        return {
            trip,
            matchedDrivers:
                nearbyDrivers.length,
        };
    };

const updateTripStatus =
    async (
        userId,
        tripId,
        newStatus,
        role
    ) => {
        return db.transaction(
            async (
                tx
            ) => {
                const [trip] =
                    await tx
                        .select()
                        .from(
                            trips
                        )
                        .where(
                            eq(
                                trips.id,
                                tripId
                            )
                        );

                if (
                    !trip
                ) {
                    throw new Error(
                        "Trip not found"
                    );
                }

                // Authorization
                const [driver] =
                    await tx
                        .select()
                        .from(
                            driverProfiles
                        )
                        .where(
                            eq(
                                driverProfiles.userId,
                                userId
                            )
                        );

                if (
                    role ===
                    "DRIVER" &&
                    trip.driverId !==
                    driver.id
                ) {
                    throw new Error(
                        "Unauthorized"
                    );
                }

                if (
                    role ===
                    "RIDER" &&
                    trip.riderId !==
                    userId
                ) {
                    throw new Error(
                        "Unauthorized"
                    );
                }

                const allowed =
                    ALLOWED_TRANSITIONS[
                    trip.status
                    ] ||
                    [];

                if (
                    !allowed.includes(
                        newStatus
                    )
                ) {
                    throw new Error(
                        `Cannot move trip from ${trip.status} to ${newStatus}`
                    );
                }

                const updateData =
                {
                    status:
                        newStatus,
                };

                if (
                    newStatus ===
                    "ARRIVED"
                ) {
                    updateData.arrivedAt =
                        new Date();
                }

                if (
                    newStatus ===
                    "IN_PROGRESS"
                ) {
                    updateData.startedAt =
                        new Date();
                }

                if (
                    newStatus ===
                    "COMPLETED"
                ) {
                    updateData.completedAt =
                        new Date();
                }

                if (
                    newStatus ===
                    "CANCELLED"
                ) {
                    updateData.cancelledAt =
                        new Date();
                }

                const [
                    updatedTrip,
                ] =
                    await tx
                        .update(
                            trips
                        )
                        .set(
                            updateData
                        )
                        .where(
                            eq(
                                trips.id,
                                tripId
                            )
                        )
                        .returning();

                await tx
                    .insert(
                        tripStatusHistory
                    )
                    .values({
                        tripId,
                        status:
                            newStatus,
                    });

                return updatedTrip;
            }
        );
    };
module.exports = {
    requestRide,
    getMyTrips,
    getPendingTrips,
    acceptRide,
    updateTripStatus
};