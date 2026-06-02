const fp = require("fastify-plugin");
const { rateLimiterService } = require("../services/redis");

async function rateLimitPlugin(fastify, opts) {
    if (!fastify.redis) {
        throw new Error("rateLimitPlugin requires redisPlugin to be registered first");
    }

    fastify.addHook("preHandler", async (request, reply) => {
        const routeConfig = request.routeOptions?.config || request.context?.config;
        
        // Allow opting out of rate limiting
        if (routeConfig && routeConfig.rateLimit === false) {
            return;
        }

        // Get route specific config or defaults
        const limitConfig = routeConfig?.rateLimit || { max: 100, window: 60 };
        const max = limitConfig.max || 100;
        const window = limitConfig.window || 60;

        // Determine client identifier: use JWT userId if available, else fallback to IP
        let clientIdentifier = `ip:${request.ip}`;
        const authHeader = request.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.split(" ")[1];
                if (token && fastify.jwt) {
                    const decoded = fastify.jwt.decode(token);
                    if (decoded && decoded.userId) {
                        clientIdentifier = `user:${decoded.userId}`;
                    }
                }
            } catch (err) {
                // Ignore decoding error and fallback to IP
            }
        }

        const routePath = request.routeOptions?.url || request.url;
        const method = request.method;
        const identifier = `${clientIdentifier}:${method}:${routePath}`;

        const result = await rateLimiterService.checkRateLimit(
            fastify.redis,
            identifier,
            max,
            window
        );

        // Set standard rate limit headers
        reply.header("X-RateLimit-Limit", max);
        reply.header("X-RateLimit-Remaining", result.remaining);
        reply.header("X-RateLimit-Reset", result.retryAfter);

        if (!result.allowed) {
            reply.header("Retry-After", result.retryAfter);
            return reply.code(429).send({
                message: "Too Many Requests",
                retryAfter: result.retryAfter,
            });
        }
    });
}

module.exports = fp(rateLimitPlugin);
