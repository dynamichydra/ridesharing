const TripsRepository = require("./trips.repository");
const DriversRepository = require("../drivers/drivers.repository");
const TripsFareService = require("./trips.fare.service");
const { haversineDistance } = require("../../utils/haversine");
const {
    TRIP_STATUS,
    ALLOWED_TRANSITIONS,
    STATUS_TIMESTAMP_MAP,
    DRIVER_CANCELLABLE_STATUSES,
    RIDER_CANCELLABLE_STATUSES,
} = require("./trips.constants");

// Errors

class TripNotFoundError extends Error {
    constructor() { super("Trip not found"); this.statusCode = 404; }
}
class UnauthorizedError extends Error {
    constructor(msg = "Unauthorized") { super(msg); this.statusCode = 403; }
}
class InvalidTransitionError extends Error {
    constructor(from, to) {
        super(`Cannot transition trip from ${from} to ${to}`);
        this.statusCode = 422;
    }
}
class BusinessRuleError extends Error {
    constructor(msg) { super(msg); this.statusCode = 400; }
}

function assertValidTransition(fromStatus, toStatus) {
    const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
        throw new InvalidTransitionError(fromStatus, toStatus);
    }
}

function buildTransitionUpdateData(toStatus, extraData = {}) {
    const timestampField = STATUS_TIMESTAMP_MAP[toStatus];
    return {
        ...extraData,
        status: toStatus,
        ...(timestampField ? { [timestampField]: new Date() } : {}),
    };
}

// TripsService

class TripsService {

    // Queries

    static async getMyTrips(riderId) {
        return TripsRepository.findByRiderId(riderId);
    }

    static async getPendingTrips() {
        return TripsRepository.findPendingTrips();
    }

    static async findNearbyDrivers(latitude, longitude, radiusKm = 15) {
        const drivers = await DriversRepository.findOnlineDriversWithLocations();

        return drivers
            .map((driver) => {
                const distance = haversineDistance(
                    latitude,
                    longitude,
                    Number(driver.latitude),
                    Number(driver.longitude)
                );
                return { ...driver, distanceKm: Number(distance.toFixed(2)) };
            })
            .filter((d) => d.distanceKm <= radiusKm)
            .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    // Trip creation

    static async requestRide(riderId, payload) {
        const fareInfo = await TripsFareService.estimateFare(
            payload.pickupLat,
            payload.pickupLng,
            payload.destinationLat,
            payload.destinationLng
        );

        const selectedFare = fareInfo.fares.find(
            (item) => item.vehicleType === payload.vehicleType
        );
        if (!selectedFare) {
            throw new BusinessRuleError("Invalid vehicle type");
        }

        const nearbyDrivers = await this.findNearbyDrivers(
            payload.pickupLat,
            payload.pickupLng
        );

        const trip = await TripsRepository.runTransaction(async (tx) => {
            const createdTrip = await TripsRepository.createTrip({
                riderId,
                pickupAddress: payload.pickupAddress,
                pickupLat: payload.pickupLat.toString(),
                pickupLng: payload.pickupLng.toString(),
                destinationAddress: payload.destinationAddress,
                destinationLat: payload.destinationLat.toString(),
                destinationLng: payload.destinationLng.toString(),
                estimatedFare: selectedFare.estimatedFare.toString(),
                distanceKm: fareInfo.distanceKm.toString(),
                estimatedDuration: fareInfo.estimatedDuration,
                status: TRIP_STATUS.SEARCHING,
            }, tx);

            await TripsRepository.createStatusHistory(
                createdTrip.id,
                TRIP_STATUS.SEARCHING,
                null,
                riderId,
                null,
                tx
            );

            if (nearbyDrivers.length) {
                const offers = nearbyDrivers.map((driver) => ({
                    tripId: createdTrip.id,
                    driverId: driver.driverId,
                    status: "PENDING",
                }));
                await TripsRepository.createOffers(offers, tx);
            }

            return createdTrip;
        });

        return { trip, matchedDrivers: nearbyDrivers.length };
    }

    // Lifecycle actions

    /**
     * DRIVER accepts a trip: SEARCHING -> DRIVER_ASSIGNED.
     * Validates the driver has an active offer for this trip.
     */
    static async acceptTrip(driverUserId, tripId) {
        return TripsRepository.runTransaction(async (tx) => {
            const driver = await TripsRepository.findDriverProfileByUserId(driverUserId, tx);
            if (!driver) throw new UnauthorizedError("Driver profile not found");

            const offer = await TripsRepository.findOfferForDriver(tripId, driver.id, tx);
            if (!offer) throw new BusinessRuleError("No active offer for this trip");

            const trip = await TripsRepository.findTripById(tripId, tx);
            if (!trip) throw new TripNotFoundError();
            assertValidTransition(trip.status, TRIP_STATUS.DRIVER_ASSIGNED);

            const updatedTrip = await TripsRepository.updateTripWhenStatus(
                tripId,
                trip.status,
                buildTransitionUpdateData(
                    TRIP_STATUS.DRIVER_ASSIGNED,
                    { driverId: driver.id }
                ),
                tx
            );
            if (!updatedTrip) {
                throw new BusinessRuleError("Trip state changed while accepting");
            }

            await TripsRepository.updateOfferStatus(offer.id, "ACCEPTED", tx);
            await TripsRepository.expireOtherOffers(tripId, offer.id, tx);

            await TripsRepository.createStatusHistory(
                tripId,
                TRIP_STATUS.DRIVER_ASSIGNED,
                TRIP_STATUS.SEARCHING,
                driverUserId,
                null,
                tx
            );

            return updatedTrip;
        });
    }

    /**
     * DRIVER marks themselves as arrived: DRIVER_ASSIGNED -> DRIVER_ARRIVING.
     */
    static async driverArrived(driverUserId, tripId) {
        return this._driverTransition(
            driverUserId,
            tripId,
            TRIP_STATUS.DRIVER_ASSIGNED,
            TRIP_STATUS.DRIVER_ARRIVING
        );
    }

    /**
     * DRIVER starts the trip: DRIVER_ARRIVING -> STARTED.
     */
    static async startTrip(driverUserId, tripId) {
        return this._driverTransition(
            driverUserId,
            tripId,
            TRIP_STATUS.DRIVER_ARRIVING,
            TRIP_STATUS.STARTED
        );
    }

    /**
     * DRIVER completes the trip: STARTED -> COMPLETED.
     */
    static async completeTrip(driverUserId, tripId) {
        return this._driverTransition(
            driverUserId,
            tripId,
            TRIP_STATUS.STARTED,
            TRIP_STATUS.COMPLETED
        );
    }

    static async markNoDriverFound(tripId, changedByUserId = null) {
        return TripsRepository.runTransaction(async (tx) => {
            const trip = await TripsRepository.findTripById(tripId, tx);
            if (!trip) throw new TripNotFoundError();

            assertValidTransition(trip.status, TRIP_STATUS.NO_DRIVER_FOUND);

            const updatedTrip = await TripsRepository.updateTripWhenStatus(
                tripId,
                trip.status,
                buildTransitionUpdateData(TRIP_STATUS.NO_DRIVER_FOUND),
                tx
            );
            if (!updatedTrip) {
                throw new BusinessRuleError("Trip state changed during transition");
            }

            await TripsRepository.createStatusHistory(
                tripId,
                TRIP_STATUS.NO_DRIVER_FOUND,
                trip.status,
                changedByUserId,
                null,
                tx
            );

            return updatedTrip;
        });
    }

    /**
     * DRIVER or RIDER cancels a trip.
     * Each role has a restricted set of statuses from which they may cancel.
     */
    static async cancelTrip(userId, tripId, role, reason = null) {
        return TripsRepository.runTransaction(async (tx) => {
            const trip = await TripsRepository.findTripById(tripId, tx);
            if (!trip) throw new TripNotFoundError();

            const normalizedRole = (role || "").toUpperCase();

            if (normalizedRole === "DRIVER") {
                const driver = await TripsRepository.findDriverProfileByUserId(userId, tx);
                if (!driver || trip.driverId !== driver.id) {
                    throw new UnauthorizedError("You are not the assigned driver for this trip");
                }
                if (!DRIVER_CANCELLABLE_STATUSES.includes(trip.status)) {
                    throw new InvalidTransitionError(trip.status, TRIP_STATUS.CANCELLED);
                }
            } else if (normalizedRole === "RIDER") {
                if (trip.riderId !== userId) {
                    throw new UnauthorizedError("You are not the rider for this trip");
                }
                if (!RIDER_CANCELLABLE_STATUSES.includes(trip.status)) {
                    throw new InvalidTransitionError(trip.status, TRIP_STATUS.CANCELLED);
                }
            } else {
                throw new UnauthorizedError();
            }

            assertValidTransition(trip.status, TRIP_STATUS.CANCELLED);

            const updatedTrip = await TripsRepository.updateTripWhenStatus(
                tripId,
                trip.status,
                buildTransitionUpdateData(TRIP_STATUS.CANCELLED, {
                    cancellationReason: reason ?? null,
                }),
                tx
            );
            if (!updatedTrip) {
                throw new BusinessRuleError("Trip state changed while cancelling");
            }

            await TripsRepository.createStatusHistory(
                tripId,
                TRIP_STATUS.CANCELLED,
                trip.status,
                userId,
                reason ? { reason } : null,
                tx
            );

            return updatedTrip;
        });
    }

    // Private helpers

    /**
     * Generic driver-owned state transition.
     * Validates ownership, verifies the current status matches expectedFrom,
     * enforces the ALLOWED_TRANSITIONS table, sets the correct timestamp,
     * and writes a history row - all inside a single transaction.
     *
     * @param {string} driverUserId  - JWT user id of the requesting driver
     * @param {string} tripId
     * @param {string} expectedFrom  - status the trip MUST currently be in
     * @param {string} toStatus      - status to transition into
     */
    static async _driverTransition(driverUserId, tripId, expectedFrom, toStatus) {
        return TripsRepository.runTransaction(async (tx) => {
            const driver = await TripsRepository.findDriverProfileByUserId(driverUserId, tx);
            if (!driver) throw new UnauthorizedError("Driver profile not found");

            const trip = await TripsRepository.findTripByDriver(tripId, driver.id, tx);
            if (!trip) throw new TripNotFoundError();

            // Guard: current status must match what the caller expects
            if (trip.status !== expectedFrom) {
                throw new InvalidTransitionError(trip.status, toStatus);
            }

            assertValidTransition(trip.status, toStatus);

            const updatedTrip = await TripsRepository.updateTripWhenStatus(
                tripId,
                trip.status,
                buildTransitionUpdateData(toStatus),
                tx
            );
            if (!updatedTrip) {
                throw new BusinessRuleError("Trip state changed during transition");
            }

            await TripsRepository.createStatusHistory(
                tripId,
                toStatus,
                trip.status,
                driverUserId,
                null,
                tx
            );

            return updatedTrip;
        });
    }
}

module.exports = TripsService;
module.exports.TripNotFoundError = TripNotFoundError;
module.exports.UnauthorizedError = UnauthorizedError;
module.exports.InvalidTransitionError = InvalidTransitionError;
module.exports.BusinessRuleError = BusinessRuleError;
