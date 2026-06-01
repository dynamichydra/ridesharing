const {
    pgTable,
    uuid,
    varchar,
    timestamp,
    jsonb,
} = require("drizzle-orm/pg-core");

const {
    trips,
} = require("./trips.schema");

const tripStatusHistory =
    pgTable(
        "trip_status_history",
        {
            id: uuid("id")
                .defaultRandom()
                .primaryKey(),

            tripId: uuid(
                "trip_id"
            )
                .references(
                    () => trips.id
                )
                .notNull(),

            status: varchar(
                "status",
                {
                    length: 50,
                }
            ).notNull(),

            metadata: jsonb(
                "metadata"
            ),

            createdAt:
                timestamp(
                    "created_at"
                )
                    .defaultNow()
                    .notNull(),
        }
    );

module.exports = { tripStatusHistory };