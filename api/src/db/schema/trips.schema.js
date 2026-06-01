const {
    pgTable,
    uuid,
    varchar,
    timestamp,
    decimal,
    integer,
    text,
} = require("drizzle-orm/pg-core");

const {
    users,
} = require("./users.schema");

const {
    driverProfiles,
} = require("./drivers.schema");
const { tripStatusEnum } = require("../enums");

const trips = pgTable(
    "trips",
    {
        id: uuid("id")
            .defaultRandom()
            .primaryKey(),

        riderId: uuid(
            "rider_id"
        )
            .references(
                () => users.id
            )
            .notNull(),

        driverId: uuid(
            "driver_id"
        ).references(
            () => driverProfiles.id
        ),

        pickupAddress:
            varchar(
                "pickup_address",
                { length: 500 }
            ).notNull(),

        pickupLat:
            decimal(
                "pickup_lat",
                {
                    precision: 10,
                    scale: 7,
                }
            ).notNull(),

        pickupLng:
            decimal(
                "pickup_lng",
                {
                    precision: 10,
                    scale: 7,
                }
            ).notNull(),

        destinationAddress:
            varchar(
                "destination_address",
                { length: 500 }
            ).notNull(),

        destinationLat:
            decimal(
                "destination_lat",
                {
                    precision: 10,
                    scale: 7,
                }
            ).notNull(),

        destinationLng:
            decimal(
                "destination_lng",
                {
                    precision: 10,
                    scale: 7,
                }
            ).notNull(),

        estimatedFare:
            decimal(
                "estimated_fare",
                {
                    precision: 10,
                    scale: 2,
                }
            ),

        finalFare:
            decimal(
                "final_fare",
                {
                    precision: 10,
                    scale: 2,
                }
            ),

        distanceKm:
            decimal(
                "distance_km",
                {
                    precision: 10,
                    scale: 2,
                }
            ),

        estimatedDuration:
            integer(
                "estimated_duration"
            ),

        status:
            tripStatusEnum(
                "status"
            )
                .default("SEARCHING")
                .notNull(),

        cancellationReason:
            text(
                "cancellation_reason"
            ),

        requestedAt:
            timestamp(
                "requested_at"
            )
                .defaultNow()
                .notNull(),

        acceptedAt:
            timestamp(
                "accepted_at"
            ),

        startedAt:
            timestamp(
                "started_at"
            ),

        completedAt:
            timestamp(
                "completed_at"
            ),

        cancelledAt:
            timestamp(
                "cancelled_at"
            ),

        createdAt:
            timestamp(
                "created_at"
            )
                .defaultNow()
                .notNull(),
    }
);

module.exports = {
    trips,
};