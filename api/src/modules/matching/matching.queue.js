const EventEmitter = require("events");

/**
 * Abstract MatchingQueue. 
 * Currently uses an in-memory array and EventEmitter for polling/notifying.
 * Designed to be easily replaced by Redis/BullMQ/Kafka in the future.
 */
class MatchingQueue extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
    }

    enqueueTrip(tripId) {
        if (!this.queue.includes(tripId)) {
            this.queue.push(tripId);
            this.emit("trip_added", tripId);
            console.log(`[MatchingQueue] Enqueued trip ${tripId}`);
        }
    }

    dequeueTrip() {
        return this.queue.shift(); // returns undefined if empty
    }

    get size() {
        return this.queue.length;
    }
}

// Singleton instance for the monolith
const matchingQueue = new MatchingQueue();
module.exports = matchingQueue;
