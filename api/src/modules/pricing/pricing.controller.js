const PricingService = require("./pricing.service");

class PricingController {
    static async estimateFare(req, reply) {
        try {
            const {
                pickup_lat,
                pickup_lng,
                destination_lat,
                destination_lng,
                vehicle_type
            } = req.body;

            const result = await PricingService.estimateFare(
                pickup_lat,
                pickup_lng,
                destination_lat,
                destination_lng,
                vehicle_type
            );

            return reply.code(200).send(result);
        } catch (error) {
            req.log.error(error);
            return reply.code(500).send({
                message: error.message || "Internal server error during fare estimation."
            });
        }
    }
}

module.exports = PricingController;
