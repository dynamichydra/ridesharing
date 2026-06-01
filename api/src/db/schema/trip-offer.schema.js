const {
    pgTable,
    uuid,
    timestamp,
    varchar,
} = require(
    "drizzle-orm/pg-core"
);

const {
    trips,
} = require(
    "./trips.schema"
);

const {
    driverProfiles,
} = require(
    "./drivers.schema"
);

const tripOffers =
    pgTable(
        "trip_offers",
        {
            id: uuid("id")
                .defaultRandom()
                .primaryKey(),

            tripId:
                uuid(
                    "trip_id"
                )
                    .references(
                        () =>
                            trips.id
                    )
                    .notNull(),

            driverId:
                uuid(
                    "driver_id"
                )
                    .references(
                        () =>
                            driverProfiles.id
                    )
                    .notNull(),

            status:
                varchar(
                    "status",
                    {
                        length: 50,
                    }
                )
                    .default(
                        "PENDING"
                    )
                    .notNull(),

            createdAt:
                timestamp(
                    "created_at"
                )
                    .defaultNow()
                    .notNull(),
        }
    );

module.exports = {
    tripOffers,
};