const DriversService = require("./drivers.service");

class DriversController {
    static async becomeDriver(req, reply) {
        try {
            const result = await DriversService.becomeDriver(req.user.userId, req.body);
            return reply.code(201).send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }

    static async goOnline(req, reply) {
        try {
            const result = await DriversService.updateDriverStatus(req.user.userId, "ONLINE");
            return reply.send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }

    static async goOffline(req, reply) {
        try {
            const result = await DriversService.updateDriverStatus(req.user.userId, "OFFLINE");
            return reply.send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }

    static async updateStatus(req, reply) {
        try {
            const { status } = req.body;
            const result = await DriversService.updateDriverStatus(req.user.userId, status);
            return reply.send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }

    static async updateLocation(req, reply) {
        try {
            const { latitude, longitude } = req.body;
            const result = await DriversService.updateDriverLocation(req.user.userId, latitude, longitude);
            return reply.send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }

    static async getMyOffers(req, reply) {
        try {
            const result = await DriversService.getMyOffers(req.user.userId);
            return reply.send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }
}

module.exports = DriversController;
