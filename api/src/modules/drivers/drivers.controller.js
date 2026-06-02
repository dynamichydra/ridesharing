const DriversService = require("./drivers.service");
const {
    DriverNotFoundError,
    InvalidDriverStatusTransitionError,
    DriverAvailabilityError,
} = require("./drivers.service");

function resolveStatusCode(error) {
    if (
        error instanceof DriverNotFoundError ||
        error instanceof InvalidDriverStatusTransitionError ||
        error instanceof DriverAvailabilityError
    ) {
        return error.statusCode;
    }
    return 400;
}

function sendError(reply, error) {
    return reply.code(resolveStatusCode(error)).send({
        message: error.message,
    });
}

class DriversController {
    static async becomeDriver(req, reply) {
        try {
            const result = await DriversService.becomeDriver(req.user.userId, req.body);
            return reply.code(201).send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }

    static async goOnline(req, reply) {
        try {
            const result = await DriversService.goOnline(req.user.userId);
            return reply.send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }

    static async goOffline(req, reply) {
        try {
            const result = await DriversService.goOffline(req.user.userId);
            return reply.send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }

    static async getMyStatus(req, reply) {
        try {
            const result = await DriversService.getMyStatus(req.user.userId);
            return reply.send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }

    static async updateLocation(req, reply) {
        try {
            const { latitude, longitude } = req.body;
            const result = await DriversService.updateDriverLocation(req.user.userId, latitude, longitude);
            return reply.send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }

    static async getMyOffers(req, reply) {
        try {
            const result = await DriversService.getMyOffers(req.user.userId);
            return reply.send(result);
        } catch (error) {
            return sendError(reply, error);
        }
    }
}

module.exports = DriversController;
