const matchingQueue = require("./matching.queue");
const MatchingRepository = require("./matching.repository");

class MatchingController {
    
    /**
     * POST /matching/start/:tripId
     * Manually enqueues a trip for matching (useful for testing or manual dispatch).
     */
    static async startMatching(req, reply) {
        try {
            const { tripId } = req.params;
            
            const trip = await MatchingRepository.getTrip(tripId);
            if (!trip) {
                return reply.code(404).send({ message: "Trip not found" });
            }
            if (trip.status !== "SEARCHING") {
                return reply.code(400).send({ message: "Trip is not in SEARCHING status" });
            }

            matchingQueue.enqueueTrip(tripId);
            
            return reply.send({ message: "Trip matching started", tripId });
        } catch (error) {
            req.log.error(error);
            return reply.code(500).send({ message: "Internal server error" });
        }
    }

    /**
     * GET /matching/status/:tripId
     * Gets the current matching status for the UI.
     */
    static async getMatchingStatus(req, reply) {
        try {
            const { tripId } = req.params;
            const trip = await MatchingRepository.getTrip(tripId);
            
            if (!trip) {
                return reply.code(404).send({ message: "Trip not found" });
            }

            return reply.send({ 
                tripId: trip.id, 
                status: trip.status,
                driverId: trip.driverId
            });
        } catch (error) {
            req.log.error(error);
            return reply.code(500).send({ message: "Internal server error" });
        }
    }
}

module.exports = MatchingController;
