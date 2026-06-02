const fp = require("fastify-plugin");
const { createClient } = require("redis");

async function redisPlugin(fastify, opts) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    fastify.log.info(`Connecting to Redis at ${redisUrl}`);

    const client = createClient({
        url: redisUrl,
    });

    const subscriber = client.duplicate();

    client.on("error", (err) => {
        fastify.log.error({ err }, "Redis Client Error");
    });

    subscriber.on("error", (err) => {
        fastify.log.error({ err }, "Redis Subscriber Client Error");
    });

    client.on("connect", () => {
        fastify.log.info("Redis client connected");
    });

    subscriber.on("connect", () => {
        fastify.log.info("Redis subscriber connected");
    });

    client.on("ready", () => {
        fastify.log.info("Redis client ready");
    });

    subscriber.on("ready", () => {
        fastify.log.info("Redis subscriber ready");
    });

    await client.connect();
    await subscriber.connect();

    fastify.decorate("redis", client);
    fastify.decorate("redisSubscriber", subscriber);

    fastify.addHook("onClose", async (instance) => {
        fastify.log.info("Disconnecting from Redis...");
        await Promise.all([
            client.quit(),
            subscriber.quit()
        ]);
    });
}

module.exports = fp(redisPlugin);
