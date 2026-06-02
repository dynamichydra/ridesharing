const HASH_KEY = "drivers:online";
const TTL_PREFIX = "drivers:online:ttl:";
const GEO_KEY = "geo:drivers:active";
const DEFAULT_TTL = 600; // 10 minutes

class DriverCacheService {
    /**
     * Mark a driver online, storing metadata and setting a TTL sentinel.
     * @param {import('redis').RedisClientType} redis
     * @param {string} driverId
     * @param {object} metadata
     * @param {number} ttlSeconds
     */
    static async setOnline(redis, driverId, metadata, ttlSeconds = DEFAULT_TTL) {
        try {
            const dataStr = JSON.stringify(metadata);
            await redis.hSet(HASH_KEY, driverId.toString(), dataStr);
            await redis.set(`${TTL_PREFIX}${driverId}`, "1", { EX: ttlSeconds });
            return { success: true };
        } catch (error) {
            throw new Error(`Failed to cache online driver: ${error.message}`);
        }
    }

    /**
     * Mark a driver offline, removing them from cache and geo indexes.
     * @param {import('redis').RedisClientType} redis
     * @param {string} driverId
     */
    static async setOffline(redis, driverId) {
        try {
            const idStr = driverId.toString();
            await redis.hDel(HASH_KEY, idStr);
            await redis.del(`${TTL_PREFIX}${driverId}`);
            await redis.zRem(GEO_KEY, idStr);
            return { success: true };
        } catch (error) {
            throw new Error(`Failed to remove driver from cache: ${error.message}`);
        }
    }

    /**
     * Check if a driver is online by verifying their TTL sentinel.
     * Performs lazy cleanup if sentinel has expired.
     * @param {import('redis').RedisClientType} redis
     * @param {string} driverId
     */
    static async isOnline(redis, driverId) {
        try {
            const exists = await redis.exists(`${TTL_PREFIX}${driverId}`);
            if (!exists) {
                // Lazy cleanup
                const idStr = driverId.toString();
                await redis.hDel(HASH_KEY, idStr);
                await redis.zRem(GEO_KEY, idStr);
                return false;
            }
            return true;
        } catch (error) {
            throw new Error(`Failed to check if driver is online: ${error.message}`);
        }
    }

    /**
     * Get an online driver's metadata.
     * @param {import('redis').RedisClientType} redis
     * @param {string} driverId
     */
    static async getOnlineDriver(redis, driverId) {
        try {
            const online = await this.isOnline(redis, driverId);
            if (!online) return null;

            const data = await redis.hGet(HASH_KEY, driverId.toString());
            return data ? JSON.parse(data) : null;
        } catch (error) {
            throw new Error(`Failed to get cached driver: ${error.message}`);
        }
    }

    /**
     * Get all currently online drivers, performing lazy cleanup for any expired sentinels.
     * @param {import('redis').RedisClientType} redis
     */
    static async getAllOnline(redis) {
        try {
            const all = await redis.hGetAll(HASH_KEY);
            const driverIds = Object.keys(all);
            if (driverIds.length === 0) return [];

            // Pipeline to check existences of all TTL keys
            const pipeline = redis.multi();
            for (const id of driverIds) {
                pipeline.exists(`${TTL_PREFIX}${id}`);
            }
            const existStatuses = await pipeline.exec();

            const onlineDrivers = [];
            for (let i = 0; i < driverIds.length; i++) {
                const id = driverIds[i];
                const exists = existStatuses[i];
                if (exists) {
                    onlineDrivers.push(JSON.parse(all[id]));
                } else {
                    // Lazy cleanup for expired driver
                    await this.setOffline(redis, id);
                }
            }
            return onlineDrivers;
        } catch (error) {
            throw new Error(`Failed to get all online drivers: ${error.message}`);
        }
    }

    /**
     * Get the count of online drivers.
     * @param {import('redis').RedisClientType} redis
     */
    static async getOnlineCount(redis) {
        try {
            // Note: This returns the count of fields in the Hash.
            // Since we do lazy cleanup, it might include some recently expired drivers.
            // But it is O(1) and suitable for a quick estimate.
            return await redis.hLen(HASH_KEY);
        } catch (error) {
            throw new Error(`Failed to get online count: ${error.message}`);
        }
    }
}

module.exports = DriverCacheService;
