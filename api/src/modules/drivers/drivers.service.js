const DriversRepository = require("./drivers.repository");
const { sendToUser } = require("../common/socket.manager");
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

    static async goOnline(userId) {
        return this.transitionDriverStatusByUserId(userId, DRIVER_STATUS.ONLINE);
    }

    static async goOffline(userId) {
        return this.transitionDriverStatusByUserId(userId, DRIVER_STATUS.OFFLINE);
    }

    static async transitionDriverStatusByUserId(userId, nextStatus, tx = undefined) {
        const driver = await DriversRepository.findByUserId(userId, tx);
        if (!driver) {
            throw new DriverNotFoundError();
        }

        return this.transitionDriverStatus(driver, nextStatus, tx);
    }

    static async transitionDriverStatus(driver, nextStatus, tx = undefined) {
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

        return updatedDriver;
    }

    static assertCanAcceptTrip(driver) {
        if (driver.status !== DRIVER_STATUS.ONLINE) {
            throw new DriverAvailabilityError("Driver must be ONLINE to accept trips");
        }
    }

    static async updateDriverLocation(userId, latitude, longitude) {
        const driver = await DriversRepository.findByUserId(userId);

        if (!driver) {
            throw new DriverNotFoundError();
        }

        if (!LOCATION_ELIGIBLE_STATUSES.includes(driver.status)) {
            throw new DriverAvailabilityError("Driver must be ONLINE or ON_TRIP to update location");
        }

        // Upsert location coordinates
        await DriversRepository.upsertDriverLocation(driver.id, latitude, longitude);

        // Find active trip using repository
        const activeTrip = await DriversRepository.findActiveTrip(driver.id, [
            TRIP_STATUS.DRIVER_ASSIGNED,
            TRIP_STATUS.DRIVER_ARRIVING,
            TRIP_STATUS.STARTED,
        ]);

        // Push real-time driver coordinates to matched rider
        if (activeTrip) {
            sendToUser(activeTrip.riderId, {
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
