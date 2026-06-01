const {
    pgTable,
    uuid,
    decimal,
    timestamp,
} = require(
    "drizzle-orm/pg-core"
);

const {
    driverProfiles,
} = require(
    "./drivers.schema"
);

const driverLocations =
    pgTable(
        "driver_locations",
        {
            driverId: uuid(
                "driver_id"
            )
                .references(
                    () =>
                        driverProfiles.id
                )
                .primaryKey(),

            latitude:
                decimal(
                    "latitude",
                    {
                        precision: 10,
                        scale: 7,
                    }
                ).notNull(),

            longitude:
                decimal(
                    "longitude",
                    {
                        precision: 10,
                        scale: 7,
                    }
                ).notNull(),

            updatedAt:
                timestamp(
                    "updated_at"
                )
                    .defaultNow()
                    .notNull(),
        }
    );

module.exports = {
    driverLocations,
};