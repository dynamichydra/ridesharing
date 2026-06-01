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
    eq,
} = require(
    "drizzle-orm"
);

const {
    haversineDistance,
} = require(
    "../../utils/haversine"
);

const findNearbyDrivers =
    async (
        latitude,
        longitude,
        radiusKm = 15
    ) => {
        const drivers =
            await db
                .select({
                    driverId:
                        driverProfiles.id,

                    userId:
                        driverProfiles.userId,

                    latitude:
                        driverLocations.latitude,

                    longitude:
                        driverLocations.longitude,

                    rating:
                        driverProfiles.rating,
                })
                .from(
                    driverProfiles
                )
                .innerJoin(
                    driverLocations,
                    eq(
                        driverProfiles.id,
                        driverLocations.driverId
                    )
                )
                .where(
                    eq(
                        driverProfiles.status,
                        "ONLINE"
                    )
                );

        const nearbyDrivers =
            drivers
                .map(
                    (
                        driver
                    ) => {
                        console.log(latitude,
                            longitude, driver.latitude, driver.longitude );
                        
                        const distance =
                            haversineDistance(
                                latitude,
                                longitude,
                                Number(
                                    driver.latitude
                                ),
                                Number(
                                    driver.longitude
                                )
                            );

                        return {
                            ...driver,
                            distanceKm:
                                Number(
                                    distance.toFixed(2)
                                ),
                        };
                    }
                )
                .filter(
                    (
                        driver
                    ) =>
                        driver.distanceKm <=
                        radiusKm
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a.distanceKm -
                        b.distanceKm
                );

        return nearbyDrivers;
    };

module.exports = {
    findNearbyDrivers,
};