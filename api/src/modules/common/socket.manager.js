const clients = new Map();

const registerClient = (userId, socket) => {
    clients.set(userId, socket);
};

const removeClient = (userId) => {
    clients.delete(userId);
};

const sendLocal = (userId, event) => {
    const socket = clients.get(userId);

    if (socket && socket.readyState === 1) {
        try {
            socket.send(JSON.stringify(event));
        } catch (err) {
            console.error(`Error sending local socket message to user ${userId}:`, err);
        }
    }
};

/**
 * Broadcast an event to a user across the Redis Pub/Sub cluster.
 * Falls back to local delivery if Redis is not provided or fails.
 * @param {import('redis').RedisClientType} redis
 * @param {string} userId
 * @param {object} event
 */
const broadcastToUser = async (redis, userId, event) => {
    if (redis) {
        try {
            const payload = JSON.stringify({ userId, event });
            await redis.publish("channel:user:notifications", payload);
            return;
        } catch (err) {
            console.error(`Failed to publish message to Redis Pub/Sub for user ${userId}:`, err);
        }
    }
    // Fallback to local connection
    sendLocal(userId, event);
};

module.exports = {
    registerClient,
    removeClient,
    sendLocal,
    broadcastToUser,
};
