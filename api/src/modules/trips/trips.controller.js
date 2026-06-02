const TripsService = require("./trips.service");
const TripsFareService = require("./trips.fare.service");
const {
    TripNotFoundError,
    UnauthorizedError,
    InvalidTransitionError,
    BusinessRuleError,
} = require("./trips.service");

// ─── Error → HTTP status code mapper ─────────────────────────────────────────

function resolveStatusCode(error) {
    if (
        error instanceof TripNotFoundError ||
        error instanceof UnauthorizedError ||
        error instanceof InvalidTransitionError ||
        error instanceof BusinessRuleError
    ) {
        return error.statusCode;
    }
    return 500;
}

function sendError(reply, error) {
    const code = resolveStatusCode(error);
    return reply.code(code).send({ message: error.message });
}

// ─── TripsController ──────────────────────────────────────────────────────────

class TripsController {

    // ── Rider queries ─────────────────────────────────────────────────────────

    static async getMyTrips(req, reply) {
        try {
            const result = await TripsService.getMyTrips(req.user.userId);
            return reply.send(result);
        } catch (error) {
            return sendError(reply, error);
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
            return sendError(reply, error);
        }
    }

    static async requestRide(req, reply) {
        try {
            const result = await TripsService.requestRide(req.user.userId, req.body);
            return reply.code(201).send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }

    // ── Driver queries ────────────────────────────────────────────────────────

    static async getPendingTrips(req, reply) {
        try {
            const result = await TripsService.getPendingTrips();
            return reply.send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }

    // ── Driver lifecycle actions ──────────────────────────────────────────────

    /**
     * POST /trips/:id/accept
     * SEARCHING → DRIVER_ASSIGNED
     */
    static async acceptTrip(req, reply) {
        try {
            const result = await TripsService.acceptTrip(
                req.user.userId,
                req.params.id
            );
            return reply.send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }

    /**
     * POST /trips/:id/arrived
     * DRIVER_ASSIGNED → DRIVER_ARRIVING
     */
    static async driverArrived(req, reply) {
        try {
            const result = await TripsService.driverArrived(
                req.user.userId,
                req.params.id
            );
            return reply.send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }

    /**
     * POST /trips/:id/start
     * DRIVER_ARRIVING → STARTED
     */
    static async startTrip(req, reply) {
        try {
            const result = await TripsService.startTrip(
                req.user.userId,
                req.params.id
            );
            return reply.send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }

    /**
     * POST /trips/:id/complete
     * STARTED → COMPLETED
     */
    static async completeTrip(req, reply) {
        try {
            const result = await TripsService.completeTrip(
                req.user.userId,
                req.params.id
            );
            return reply.send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }

    // ── Shared (DRIVER + RIDER) ───────────────────────────────────────────────

    /**
     * POST /trips/:id/cancel
     * DRIVER: DRIVER_ASSIGNED | DRIVER_ARRIVING → CANCELLED
     * RIDER:  SEARCHING | DRIVER_ASSIGNED | DRIVER_ARRIVING → CANCELLED
     */
    static async cancelTrip(req, reply) {
        try {
            const result = await TripsService.cancelTrip(
                req.user.userId,
                req.params.id,
                req.user.role,
                req.body?.reason ?? null
            );
            return reply.send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }
}

module.exports = TripsController;
