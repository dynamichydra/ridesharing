const {
    pgTable,
    uuid,
    varchar,
    timestamp,
    decimal,
} = require("drizzle-orm/pg-core");

const { users } = require("./users.schema");
const { driverStatusEnum } = require("../enums");

const driverProfiles = pgTable(
    "driver_profiles",
    {
        id: uuid("id")
            .defaultRandom()
            .primaryKey(),

        userId: uuid("user_id")
            .references(() => users.id)
            .unique()
            .notNull(),

        licenseNumber: varchar(
            "license_number",
            { length: 255 }
        ).notNull(),

        vehicleType: varchar(
            "vehicle_type",
            { length: 100 }
        ).notNull(),

        vehicleNumber: varchar(
            "vehicle_number",
            { length: 100 }
        ).notNull(),

        status:
            driverStatusEnum(
                "status"
            )
                .default("OFFLINE")
                .notNull(),

        currentLat: decimal(
            "current_lat",
            {
                precision: 10,
                scale: 7,
            }
        ),

        currentLng: decimal(
            "current_lng",
            {
                precision: 10,
                scale: 7,
            }
        ),

        rating: decimal(
            "rating",
            {
                precision: 2,
                scale: 1,
            }
        ).default("5.0"),

        lastActiveAt:
            timestamp("last_active_at"),

        createdAt:
            timestamp("created_at")
                .defaultNow()
                .notNull(),

        updatedAt:
            timestamp("updated_at")
                .defaultNow()
                .notNull(),
    }
);

module.exports = {
    driverProfiles,
};