const db =
    require("../../db");

const {
    driverProfiles,
} = require(
    "../../db/schema/drivers.schema"
);

const {
    driverLocations,
} = require(
    "../../db/schema/driver-location.schema"
);

const {
    users,
} = require(
    "../../db/schema/users.schema"
);

const {
    sendToUser,
} = require(
    "../../socket/socket.manager"
);
const {
    eq,
    and,
    inArray,
} = require(
    "drizzle-orm"
);
const { tripOffers } = require("../../db/schema/trip-offer.schema");
const { trips } = require("../../db/schema/trips.schema");
const TRIP_STATUS =
    require(
        "../../constants/trip-status"
    );
const becomeDriver =
    async (
        userId,
        payload
    ) => {
        const [existingDriver] =
            await db
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
            existingDriver
        ) {
            throw new Error(
                "Already a driver"
            );
        }

        const [driver] =
            await db
                .insert(
                    driverProfiles
                )
                .values({
                    userId,

                    licenseNumber:
                        payload.licenseNumber,

                    vehicleType:
                        payload.vehicleType,

                    vehicleNumber:
                        payload.vehicleNumber,
                })
                .returning();

        await db
            .update(users)
            .set({
                role:
                    "DRIVER",
            })
            .where(
                eq(
                    users.id,
                    userId
                )
            );

        return driver;
    };

const updateDriverStatus =
    async (
        userId,
        status
    ) => {
        const [driver] =
            await db
                .update(
                    driverProfiles
                )
                .set({
                    status,
                    lastActiveAt:
                        new Date(),
                })
                .where(
                    eq(
                        driverProfiles.userId,
                        userId
                    )
                )
                .returning();

        if (!driver) {
            throw new Error(
                "Driver profile not found"
            );
        }

        return driver;
    };

const updateDriverLocation =
    async (
        userId,
        latitude,
        longitude
    ) => {
        const [driver] =
            await db
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

        if (!driver) {
            throw new Error(
                "Driver not found"
            );
        }

        // Optional safety:
        // only ONLINE drivers can update location
        if (
            driver.status !==
            "ONLINE"
        ) {
            throw new Error(
                "Driver is offline"
            );
        }

        // Upsert location
        await db
            .insert(
                driverLocations
            )
            .values({
                driverId:
                    driver.id,

                latitude:
                    latitude.toString(),

                longitude:
                    longitude.toString(),

                updatedAt:
                    new Date(),
            })
            .onConflictDoUpdate({
                target:
                    driverLocations.driverId,

                set: {
                    latitude:
                        latitude.toString(),

                    longitude:
                        longitude.toString(),

                    updatedAt:
                        new Date(),
                },
            });

        // Find active trip
        const [activeTrip] =
            await db
                .select()
                .from(
                    trips
                )
                .where(
                    and(
                        eq(
                            trips.driverId,
                            driver.id
                        ),

                        inArray(
                            trips.status,
                            [
                                TRIP_STATUS.DRIVER_ASSIGNED,
                                TRIP_STATUS.DRIVER_ARRIVING,
                                TRIP_STATUS.STARTED,
                            ]
                        )
                    )
                );

        // Realtime push
        if (
            activeTrip
        ) {
            sendToUser(
                activeTrip
                    .riderId,
                {
                    type:
                        "DRIVER_LOCATION",

                    payload: {
                        tripId:
                            activeTrip.id,

                        driverId:
                            driver.id,

                        latitude,

                        longitude,

                        timestamp:
                            Date.now(),
                    },
                }
            );
        }

        return {
            success: true,
        };
    };

const getMyOffers =
    async (
        userId
    ) => {
        const [driver] =
            await db
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

        if (!driver) {
            throw new Error(
                "Driver not found"
            );
        }

        return db
            .select({
                offerId:
                    tripOffers.id,

                tripId:
                    trips.id,

                pickupAddress:
                    trips.pickupAddress,

                destinationAddress:
                    trips.destinationAddress,

                estimatedFare:
                    trips.estimatedFare,

                distanceKm:
                    trips.distanceKm,

                status:
                    tripOffers.status,

                requestedAt:
                    trips.requestedAt,
            })
            .from(
                tripOffers
            )
            .innerJoin(
                trips,
                eq(
                    tripOffers.tripId,
                    trips.id
                )
            )
            .where(
                and(
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
    };
module.exports = {
    becomeDriver,
    updateDriverStatus,
    updateDriverLocation,
    getMyOffers
};