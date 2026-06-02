const LIMIT_KEY_PREFIX = "ratelimit:";

class RateLimiterService {
    /**
     * Check if a request rate limit is exceeded for a given identifier.
     * @param {import('redis').RedisClientType} redis
     * @param {string} identifier - unique key for the rate limit (e.g. IP or userId + route)
     * @param {number} limit - maximum number of requests allowed in the window
     * @param {number} windowSec - window size in seconds
     * @returns {Promise<{ allowed: boolean, limit: number, remaining: number, retryAfter: number }>}
     */
    static async checkRateLimit(redis, identifier, limit, windowSec) {
        try {
            const now = Math.floor(Date.now() / 1000);
            const windowIndex = Math.floor(now / windowSec);
            const key = `${LIMIT_KEY_PREFIX}${identifier}:${windowIndex}`;

            const current = await redis.incr(key);
            
            // Set expiration on first hit
            if (current === 1) {
                await redis.expire(key, windowSec);
            }

            const allowed = current <= limit;
            const remaining = Math.max(0, limit - current);
            
            // Get TTL of the rate limit key
            let ttl = await redis.ttl(key);
            if (ttl < 0) {
                ttl = windowSec;
            }

            return {
                allowed,
                limit,
                remaining,
                retryAfter: ttl,
            };
        } catch (error) {
            // In case of Redis failure, we log it and fail-open (allow the request)
            // to ensure high availability of the API.
            console.error(`Rate limiter Redis error: ${error.message}`);
            return {
                allowed: true,
                limit,
                remaining: 1,
                retryAfter: 0,
            };
        }
    }
}

module.exports = RateLimiterService;
