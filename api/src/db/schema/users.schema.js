const {
    pgTable,
    uuid,
    varchar,
    timestamp,
    boolean,
} = require("drizzle-orm/pg-core");

const {
    userRoleEnum,
} = require("../enums");

const users = pgTable("users", {
    id: uuid("id")
        .defaultRandom()
        .primaryKey(),

    fullName: varchar(
        "full_name",
        { length: 255 }
    ).notNull(),

    email: varchar(
        "email",
        { length: 255 }
    )
        .unique()
        .notNull(),

    password: varchar(
        "password",
        { length: 255 }
    ).notNull(),

    role: userRoleEnum("role")
        .default("RIDER")
        .notNull(),

    isVerified:
        boolean("is_verified")
            .default(false)
            .notNull(),

    createdAt:
        timestamp("created_at")
            .defaultNow()
            .notNull(),

    updatedAt:
        timestamp("updated_at")
            .defaultNow()
            .notNull(),
});

module.exports = {
    users,
};