const GEO_KEY = "geo:drivers:active";

class DriverLocationService {
    /**
     * Update driver real-time location.
     * @param {import('redis').RedisClientType} redis
     * @param {string} driverId
     * @param {number} lng
     * @param {number} lat
     */
    static async updateLocation(redis, driverId, lng, lat) {
        try {
            await redis.geoAdd(GEO_KEY, {
                longitude: Number(lng),
                latitude: Number(lat),
                member: driverId.toString(),
            });
            return { success: true };
        } catch (error) {
            throw new Error(`Failed to update driver location in Redis: ${error.message}`);
        }
    }

    /**
     * Remove driver location (e.g. when offline).
     * @param {import('redis').RedisClientType} redis
     * @param {string} driverId
     */
    static async removeLocation(redis, driverId) {
        try {
            await redis.zRem(GEO_KEY, driverId.toString());
            return { success: true };
        } catch (error) {
            throw new Error(`Failed to remove driver location from Redis: ${error.message}`);
        }
    }

    /**
     * Get a driver's current location from geo index.
     * @param {import('redis').RedisClientType} redis
     * @param {string} driverId
     */
    static async getLocation(redis, driverId) {
        try {
            const pos = await redis.geoPos(GEO_KEY, driverId.toString());
            if (!pos || !pos[0]) return null;
            return {
                longitude: Number(pos[0].longitude),
                latitude: Number(pos[0].latitude),
            };
        } catch (error) {
            throw new Error(`Failed to get driver location from Redis: ${error.message}`);
        }
    }

    /**
     * Find nearby drivers.
     * @param {import('redis').RedisClientType} redis
     * @param {number} lng
     * @param {number} lat
     * @param {number} radiusKm
     * @param {number} count
     */
    static async findNearby(redis, lng, lat, radiusKm = 5, count = 50) {
        try {
            const results = await redis.geoSearchWith(
                GEO_KEY,
                { longitude: Number(lng), latitude: Number(lat) },
                { radius: Number(radiusKm), unit: "km" },
                ["WITHDIST", "WITHCOORD"],
                { SORT: "ASC", COUNT: Number(count) }
            );

            return results.map((item) => ({
                driverId: item.member,
                distanceKm: Number(item.distance),
                latitude: Number(item.coordinates.latitude),
                longitude: Number(item.coordinates.longitude),
            }));
        } catch (error) {
            throw new Error(`Failed to find nearby drivers in Redis: ${error.message}`);
        }
    }
}

module.exports = DriverLocationService;
