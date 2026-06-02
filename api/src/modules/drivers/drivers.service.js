const DriversRepository = require("./drivers.repository");
const { sendToUser } = require("../common/socket.manager");
const TRIP_STATUS = require("../../constants/trip-status");

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

    static async updateDriverStatus(userId, status) {
        const driver = await DriversRepository.updateDriverStatus(userId, status);

        if (!driver) {
            throw new Error("Driver profile not found");
        }

        return driver;
    }

    static async updateDriverLocation(userId, latitude, longitude) {
        const driver = await DriversRepository.findByUserId(userId);

        if (!driver) {
            throw new Error("Driver not found");
        }

        if (driver.status !== "ONLINE") {
            throw new Error("Driver is offline");
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
            throw new Error("Driver not found");
        }

        return DriversRepository.getPendingOffers(driver.id);
    }
}

module.exports = DriversService;
