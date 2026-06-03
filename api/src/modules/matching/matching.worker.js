const matchingQueue = require("./matching.queue");
const MatchingService = require("./matching.service");

/**
 * Worker that runs continuously in the background to process matching queue.
 */
class MatchingWorker {
    constructor(redis = undefined) {
        this.redis = redis;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("[MatchingWorker] Started listening for new trips...");
        
        // Listen to event-based queue (scalable to Redis pub/sub)
        matchingQueue.on("trip_added", async (tripId) => {
            try {
                // Remove from queue so it's not processed twice 
                // (in event-driven, we just handle the event)
                const dequeuedId = matchingQueue.dequeueTrip();
                
                if (dequeuedId) {
                    // Process async without blocking the event loop
                    MatchingService.processTrip(dequeuedId, this.redis).catch(err => {
                        console.error(`[MatchingWorker] Unhandled error processing trip ${dequeuedId}:`, err);
                    });
                }
            } catch (error) {
                console.error("[MatchingWorker] Error:", error);
            }
        });
    }

    stop() {
        this.isRunning = false;
        matchingQueue.removeAllListeners("trip_added");
        console.log("[MatchingWorker] Stopped.");
    }
}

module.exports = MatchingWorker;
