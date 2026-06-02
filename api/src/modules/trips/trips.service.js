const TripsRepository = require("./trips.repository");
const DriversRepository = require("../drivers/drivers.repository");
const TripsFareService = require("./trips.fare.service");
const { haversineDistance } = require("../../utils/haversine");
const { ALLOWED_TRANSITIONS } = require("./trips.constants");

class TripsService {
    static async getMyTrips(riderId) {
        return TripsRepository.findByRiderId(riderId);
    }

    static async getPendingTrips() {
        return TripsRepository.findPendingTrips();
    }

    static async findNearbyDrivers(latitude, longitude, radiusKm = 15) {
        const drivers = await DriversRepository.findOnlineDriversWithLocations();

        const nearbyDrivers = drivers
            .map((driver) => {
                const distance = haversineDistance(
                    latitude,
                    longitude,
                    Number(driver.latitude),
                    Number(driver.longitude)
                );

                return {
                    ...driver,
                    distanceKm: Number(distance.toFixed(2)),
                };
            })
            .filter((driver) => driver.distanceKm <= radiusKm)
            .sort((a, b) => a.distanceKm - b.distanceKm);

        return nearbyDrivers;
    }

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
            throw new Error("Invalid vehicle type");
        }

        const trip = await TripsRepository.createTrip({
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
            status: "SEARCHING",
        });

        const nearbyDrivers = await this.findNearbyDrivers(
            payload.pickupLat,
            payload.pickupLng
        );

        if (nearbyDrivers.length) {
            const offers = nearbyDrivers.map((driver) => ({
                tripId: trip.id,
                driverId: driver.driverId,
                status: "PENDING",
            }));
            await TripsRepository.createOffers(offers);
        }

        return {
            trip,
            matchedDrivers: nearbyDrivers.length,
        };
    }

    static async acceptRide(userId, tripId) {
        return TripsRepository.runTransaction(async (tx) => {
            // Retrieve driver profile
            const driver = await TripsRepository.findDriverProfileByUserId(userId, tx);
            if (!driver) {
                throw new Error("Driver not found");
            }

            // Verify active pending offer
            const offer = await TripsRepository.findOfferForDriver(tripId, driver.id, tx);
            if (!offer) {
                throw new Error("Trip unavailable");
            }

            // Verify trip is still in SEARCHING status
            const trip = await TripsRepository.findTripByIdAndStatus(tripId, "SEARCHING", tx);
            if (!trip) {
                throw new Error("Trip already accepted");
            }

            // Atomically update trip status to ACCEPTED
            const updatedTrip = await TripsRepository.updateTrip(
                tripId,
                {
                    driverId: driver.id,
                    status: "ACCEPTED",
                    acceptedAt: new Date(),
                },
                tx
            );

            // Set winning offer to ACCEPTED
            await TripsRepository.updateOfferStatus(offer.id, "ACCEPTED", tx);

            // Expire all other offers for this trip
            await TripsRepository.expireOtherOffers(tripId, offer.id, tx);

            return updatedTrip;
        });
    }

    static async updateTripStatus(userId, tripId, newStatus, role) {
        return TripsRepository.runTransaction(async (tx) => {
            const trip = await TripsRepository.findTripById(tripId, tx);
            if (!trip) {
                throw new Error("Trip not found");
            }

            // Authorization validations
            const driver = await TripsRepository.findDriverProfileByUserId(userId, tx);
            
            if (role === "DRIVER" && (!driver || trip.driverId !== driver.id)) {
                throw new Error("Unauthorized");
            }

            if (role === "RIDER" && trip.riderId !== userId) {
                throw new Error("Unauthorized");
            }

            // Validate status transitions
            const allowed = ALLOWED_TRANSITIONS[trip.status] || [];
            if (!allowed.includes(newStatus)) {
                throw new Error(`Cannot move trip from ${trip.status} to ${newStatus}`);
            }

            const updateData = {
                status: newStatus,
            };

            if (newStatus === "ARRIVED") {
                updateData.arrivedAt = new Date();
            } else if (newStatus === "IN_PROGRESS") {
                updateData.startedAt = new Date();
            } else if (newStatus === "COMPLETED") {
                updateData.completedAt = new Date();
            } else if (newStatus === "CANCELLED") {
                updateData.cancelledAt = new Date();
            }

            const updatedTrip = await TripsRepository.updateTrip(tripId, updateData, tx);

            // Append state transition history ledger
            await TripsRepository.createStatusHistory(tripId, newStatus, tx);

            return updatedTrip;
        });
    }
}

module.exports = TripsService;
