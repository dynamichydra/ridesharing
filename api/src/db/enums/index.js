const {
    pgEnum,
} = require("drizzle-orm/pg-core");

const userRoleEnum =
    pgEnum("user_role", [
        "RIDER",
        "DRIVER",
        "ADMIN",
    ]);

const driverStatusEnum =
    pgEnum("driver_status", [
        "OFFLINE",
        "ONLINE",
        "BUSY",
        "ON_TRIP",
    ]);

const tripStatusEnum =
    pgEnum("trip_status", [
        "SEARCHING",
        "DRIVER_ASSIGNED",
        "DRIVER_ARRIVING",
        "STARTED",
        "COMPLETED",
        "CANCELLED",
        "NO_DRIVER_FOUND",
    ]);

module.exports = {
    userRoleEnum,
    driverStatusEnum,
    tripStatusEnum,
};