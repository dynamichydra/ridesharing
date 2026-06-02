const TripsService = require("./trips.service");
const TripsFareService = require("./trips.fare.service");

class TripsController {
    static async requestRide(req, reply) {
        try {
            const result = await TripsService.requestRide(req.user.userId, req.body);
            return reply.code(201).send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }

    static async getMyTrips(req, reply) {
        try {
            const result = await TripsService.getMyTrips(req.user.userId);
            return reply.send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }

    static async getPendingTrips(req, reply) {
        try {
            const result = await TripsService.getPendingTrips();
            return reply.send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }

    static async acceptRide(req, reply) {
        try {
            const { tripId } = req.params;
            const result = await TripsService.acceptRide(req.user.userId, tripId);
            return reply.send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }

    static async updateTripStatus(req, reply) {
        try {
            const { tripId, status } = req.body;
            const result = await TripsService.updateTripStatus(
                req.user.userId,
                tripId,
                status,
                req.user.role
            );
            return reply.send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }

    static async estimateFare(req, reply) {
        try {
            const result = await TripsFareService.estimateFare(
                req.body.pickupLat,
                req.body.pickupLng,
                req.body.destinationLat,
                req.body.destinationLng
            );
            return reply.send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }
}

module.exports = TripsController;
