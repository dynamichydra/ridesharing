const pricingMap =
    require(
        "../../config/vehicle-pricing.config"
    );

const {
    haversineDistance,
} = require(
    "../../utils/haversine"
);

const {
    getSurgeMultiplier,
} = require(
    "./surge.service"
);

const estimateFare =
    async (
        pickupLat,
        pickupLng,
        destinationLat,
        destinationLng
    ) => {
        const distanceKm =
            haversineDistance(
                pickupLat,
                pickupLng,
                destinationLat,
                destinationLng
            );

        const averageSpeed =
            30;

        const durationMinutes =
            (
                distanceKm /
                averageSpeed
            ) *
            60;

        const surge =
            await getSurgeMultiplier();

        const fares =
            Object.entries(
                pricingMap
            ).map(
                ([
                    type,
                    config,
                ]) => {
                    let fare =
                        config.baseFare +
                        distanceKm *
                        config.perKmRate +
                        durationMinutes *
                        config.perMinuteRate +
                        config.bookingFee;

                    fare *=
                        surge;

                    fare =
                        Math.max(
                            fare,
                            config.minimumFare
                        );

                    return {
                        vehicleType:
                            type,

                        estimatedFare:
                            Number(
                                fare.toFixed(
                                    2
                                )
                            ),

                        surgeMultiplier:
                            surge,
                    };
                }
            );

        return {
            distanceKm:
                Number(
                    distanceKm.toFixed(
                        2
                    )
                ),

            estimatedDuration:
                Math.ceil(
                    durationMinutes
                ),

            fares,
        };
    };

module.exports = {
    estimateFare,
};