const DriversRepository = require("./drivers.repository");
const { broadcastToUser } = require("../common/socket.manager");
const TRIP_STATUS = require("../../constants/trip-status");
const {
    DRIVER_STATUS,
    ALLOWED_DRIVER_STATUS_TRANSITIONS,
    LOCATION_ELIGIBLE_STATUSES,
} = require("./drivers.constants");

class DriverNotFoundError extends Error {
    constructor() { super("Driver profile not found"); this.statusCode = 404; }
}

class InvalidDriverStatusTransitionError extends Error {
    constructor(fromStatus, toStatus) {
        super(`Cannot transition driver from ${fromStatus} to ${toStatus}`);
        this.statusCode = 422;
    }
}

class DriverAvailabilityError extends Error {
    constructor(message) { super(message); this.statusCode = 409; }
}

function assertDriverStatusTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus) {
        return;
    }

    const allowed = ALLOWED_DRIVER_STATUS_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
        throw new InvalidDriverStatusTransitionError(fromStatus, toStatus);
    }
}

class DriversService {
    static async becomeDriver(userId, payload) {
        const existingDriver = await DriversRepository.findByUserId(userId);

        if (existingDriver) {
            throw new Error("Already a driver");
        }

        const driver = await DriversRepository.createDriverProfile({
            userId,
            licenseNumber: payload.licenseNumber,
            vehicleType: payload.vehicleType,
            vehicleNumber: payload.vehicleNumber,
        });

        await DriversRepository.updateUserRole(userId, "DRIVER");

        return driver;
    }

    static async getMyStatus(userId) {
        const driver = await DriversRepository.findByUserId(userId);
        if (!driver) {
            throw new DriverNotFoundError();
        }

        return {
            status: driver.status,
            lastActiveAt: driver.lastActiveAt,
            updatedAt: driver.updatedAt,
        };
    }

    static async goOnline(userId, redis = undefined) {
        return this.transitionDriverStatusByUserId(userId, DRIVER_STATUS.ONLINE, undefined, redis);
    }

    static async goOffline(userId, redis = undefined) {
        return this.transitionDriverStatusByUserId(userId, DRIVER_STATUS.OFFLINE, undefined, redis);
    }

    static async transitionDriverStatusByUserId(userId, nextStatus, tx = undefined, redis = undefined) {
        const driver = await DriversRepository.findByUserId(userId, tx);
        if (!driver) {
            throw new DriverNotFoundError();
        }

        return this.transitionDriverStatus(driver, nextStatus, tx, redis);
    }

    static async transitionDriverStatus(driver, nextStatus, tx = undefined, redis = undefined) {
        assertDriverStatusTransition(driver.status, nextStatus);

        if (driver.status === nextStatus) {
            return driver;
        }

        const updatedDriver = await DriversRepository.updateDriverStatusByIdWhenStatus(
            driver.id,
            driver.status,
            nextStatus,
            tx
        );
        if (!updatedDriver) {
            throw new DriverAvailabilityError("Driver status changed during transition");
        }

        if (redis) {
            try {
                const { driverCacheService, driverLocationService } = require("../../services/redis");
                if (nextStatus === DRIVER_STATUS.ONLINE) {
                    await driverCacheService.setOnline(redis, updatedDriver.id, {
                        id: updatedDriver.id,
                        userId: updatedDriver.userId,
                        licenseNumber: updatedDriver.licenseNumber,
                        vehicleType: updatedDriver.vehicleType,
                        vehicleNumber: updatedDriver.vehicleNumber,
                        status: DRIVER_STATUS.ONLINE,
                        rating: updatedDriver.rating,
                    });
                } else if (nextStatus === DRIVER_STATUS.ON_TRIP) {
                    await driverCacheService.setOnline(redis, updatedDriver.id, {
                        id: updatedDriver.id,
                        userId: updatedDriver.userId,
                        licenseNumber: updatedDriver.licenseNumber,
                        vehicleType: updatedDriver.vehicleType,
                        vehicleNumber: updatedDriver.vehicleNumber,
                        status: DRIVER_STATUS.ON_TRIP,
                        rating: updatedDriver.rating,
                    });
                } else {
                    // OFFLINE or BUSY
                    await driverCacheService.setOffline(redis, updatedDriver.id);
                    await driverLocationService.removeLocation(redis, updatedDriver.id);
                }
            } catch (err) {
                // Log and continue to not block DB transition
                console.error("Failed to sync driver status with Redis:", err);
            }
        }

        return updatedDriver;
    }

    static assertCanAcceptTrip(driver) {
        if (driver.status !== DRIVER_STATUS.ONLINE) {
            throw new DriverAvailabilityError("Driver must be ONLINE to accept trips");
        }
    }

    static async updateDriverLocation(userId, latitude, longitude, redis = undefined) {
        const driver = await DriversRepository.findByUserId(userId);

        if (!driver) {
            throw new DriverNotFoundError();
        }

        if (!LOCATION_ELIGIBLE_STATUSES.includes(driver.status)) {
            throw new DriverAvailabilityError("Driver must be ONLINE or ON_TRIP to update location");
        }

        // Upsert location coordinates in DB
        await DriversRepository.upsertDriverLocation(driver.id, latitude, longitude);

        // Sync with Redis
        if (redis) {
            try {
                const { driverLocationService, driverCacheService } = require("../../services/redis");
                await driverLocationService.updateLocation(redis, driver.id, longitude, latitude);

                // Refresh online cache TTL
                const cachedDriver = await driverCacheService.getOnlineDriver(redis, driver.id);
                if (cachedDriver) {
                    await driverCacheService.setOnline(redis, driver.id, cachedDriver);
                } else {
                    await driverCacheService.setOnline(redis, driver.id, {
                        id: driver.id,
                        userId: driver.userId,
                        licenseNumber: driver.licenseNumber,
                        vehicleType: driver.vehicleType,
                        vehicleNumber: driver.vehicleNumber,
                        status: driver.status,
                        rating: driver.rating,
                    });
                }
            } catch (err) {
                console.error("Failed to sync driver location with Redis:", err);
            }
        }

        // Find active trip using repository
        const activeTrip = await DriversRepository.findActiveTrip(driver.id, [
            TRIP_STATUS.DRIVER_ASSIGNED,
            TRIP_STATUS.DRIVER_ARRIVING,
            TRIP_STATUS.STARTED,
        ]);

        // Push real-time driver coordinates to matched rider
        if (activeTrip) {
            broadcastToUser(redis, activeTrip.riderId, {
                type: "DRIVER_LOCATION",
                payload: {
                    tripId: activeTrip.id,
                    driverId: driver.id,
                    latitude,
                    longitude,
                    timestamp: Date.now(),
                },
            });
        }

        return {
            success: true,
        };
    }

    static async getMyOffers(userId) {
        const driver = await DriversRepository.findByUserId(userId);

        if (!driver) {
            throw new DriverNotFoundError();
        }

        return DriversRepository.getPendingOffers(driver.id);
    }
}

module.exports = DriversService;
module.exports.DriverNotFoundError = DriverNotFoundError;
module.exports.InvalidDriverStatusTransitionError = InvalidDriverStatusTransitionError;
module.exports.DriverAvailabilityError = DriverAvailabilityError;
module.exports.DRIVER_STATUS = DRIVER_STATUS;
