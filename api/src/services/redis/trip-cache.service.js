const TRIP_KEY_PREFIX = "trip:";
const ACTIVE_TTL = 1800; // 30 minutes for active trips
const ENDED_TTL = 300;   // 5 minutes for completed/cancelled/failed trips

class TripCacheService {
    /**
     * Cache a trip in Redis.
     * @param {import('redis').RedisClientType} redis
     * @param {string} tripId
     * @param {object} tripData
     * @param {number} [customTtl]
     */
    static async cacheTrip(redis, tripId, tripData, customTtl) {
        try {
            const status = (tripData.status || "").toUpperCase();
            let ttl = customTtl;

            if (!ttl) {
                if (["COMPLETED", "CANCELLED", "NO_DRIVER_FOUND"].includes(status)) {
                    ttl = ENDED_TTL;
                } else {
                    ttl = ACTIVE_TTL;
                }
            }

            const dataStr = JSON.stringify(tripData);
            await redis.set(`${TRIP_KEY_PREFIX}${tripId}`, dataStr, { EX: ttl });
            return { success: true };
        } catch (error) {
            throw new Error(`Failed to cache trip in Redis: ${error.message}`);
        }
    }

    /**
     * Get a cached trip from Redis.
     * @param {import('redis').RedisClientType} redis
     * @param {string} tripId
     */
    static async getCachedTrip(redis, tripId) {
        try {
            const data = await redis.get(`${TRIP_KEY_PREFIX}${tripId}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            throw new Error(`Failed to get cached trip from Redis: ${error.message}`);
        }
    }

    /**
     * Update a cached trip's status and merge extra data.
     * If the trip is not in the cache, does nothing (it will be cached on demand on next read).
     * @param {import('redis').RedisClientType} redis
     * @param {string} tripId
     * @param {string} status
     * @param {object} [extraFields]
     */
    static async updateCachedTripStatus(redis, tripId, status, extraFields = {}) {
        try {
            const cachedTrip = await this.getCachedTrip(redis, tripId);
            if (!cachedTrip) return null;

            const updatedTrip = {
                ...cachedTrip,
                ...extraFields,
                status,
                updatedAt: new Date().toISOString(),
            };

            await this.cacheTrip(redis, tripId, updatedTrip);
            return updatedTrip;
        } catch (error) {
            throw new Error(`Failed to update cached trip status in Redis: ${error.message}`);
        }
    }

    /**
     * Remove a trip from cache.
     * @param {import('redis').RedisClientType} redis
     * @param {string} tripId
     */
    static async removeCachedTrip(redis, tripId) {
        try {
            await redis.del(`${TRIP_KEY_PREFIX}${tripId}`);
            return { success: true };
        } catch (error) {
            throw new Error(`Failed to remove cached trip from Redis: ${error.message}`);
        }
    }
}

module.exports = TripCacheService;
