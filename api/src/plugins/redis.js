const fp = require("fastify-plugin");
const { createClient } = require("redis");

async function redisPlugin(fastify, opts) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    fastify.log.info(`Connecting to Redis at ${redisUrl}`);

    const client = createClient({
        url: redisUrl,
    });

    client.on("error", (err) => {
        fastify.log.error({ err }, "Redis Client Error");
    });

    client.on("connect", () => {
        fastify.log.info("Redis client connected");
    });

    client.on("ready", () => {
        fastify.log.info("Redis client ready");
    });

    await client.connect();

    fastify.decorate("redis", client);

    fastify.addHook("onClose", async (instance) => {
        fastify.log.info("Disconnecting from Redis...");
        await client.quit();
    });
}

module.exports = fp(redisPlugin);
