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

const { users } = require("./users.schema");

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

            /**
             * The status the trip transitioned FROM.
             * NULL only for the very first history row (SEARCHING).
             */
            fromStatus: varchar(
                "from_status",
                { length: 50 }
            ),

            /**
             * The status the trip transitioned TO.
             */
            status: varchar(
                "status",
                { length: 50 }
            ).notNull(),

            /**
             * The user (rider or driver) who triggered this transition.
             */
            changedByUserId: uuid(
                "changed_by_user_id"
            ).references(() => users.id),

            /** Arbitrary audit payload (e.g. cancellation reason). */
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