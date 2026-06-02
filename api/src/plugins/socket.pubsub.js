const fp = require("fastify-plugin");
const { sendLocal } = require("../modules/common/socket.manager");

async function socketPubSubPlugin(fastify, opts) {
    if (!fastify.redisSubscriber) {
        throw new Error("socketPubSubPlugin requires redisSubscriber to be initialized first");
    }

    const channelName = "channel:user:notifications";
    fastify.log.info(`Subscribing to Redis Pub/Sub channel: ${channelName}`);

    try {
        await fastify.redisSubscriber.subscribe(channelName, (messageStr) => {
            try {
                const message = JSON.parse(messageStr);
                const { userId, event } = message;

                if (userId && event) {
                    sendLocal(userId, event);
                }
            } catch (parseErr) {
                fastify.log.error({ err: parseErr }, "Failed to parse Pub/Sub socket notification message");
            }
        });
        
        fastify.log.info(`Successfully subscribed to ${channelName}`);
    } catch (err) {
        fastify.log.error({ err }, `Failed to subscribe to Redis Pub/Sub channel: ${channelName}`);
    }
}

module.exports = fp(socketPubSubPlugin);
