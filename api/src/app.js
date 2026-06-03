const Fastify = require("fastify");
const cors = require("@fastify/cors");
const helmet = require("@fastify/helmet");

// Import Plugins
const jwtPlugin = require("./plugins/jwt");
const authPlugin = require("./plugins/auth");
const redisPlugin = require("./plugins/redis");
const rateLimitPlugin = require("./plugins/rate-limit");
const swaggerPlugin = require("./plugins/swagger");

// Import Feature Routes
const socketRoutes = require("./modules/common/socket.routes");
const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const driversRoutes = require("./modules/drivers/drivers.routes");
const tripsRoutes = require("./modules/trips/trips.routes");
const pricingRoutes = require("./modules/pricing/pricing.routes");
const matchingRoutes = require("./modules/matching/matching.routes");
const MatchingWorker = require("./modules/matching/matching.worker");
const kafkaProducer = require("./infrastructure/kafka/kafka.producer");
const KafkaConsumer = require("./infrastructure/kafka/kafka.consumer");
const handlers = require("./infrastructure/kafka/handlers");

async function buildApp() {
    const app = Fastify({
        logger: true,
    });

    // 1. Register base security and sharing middlewares
    await app.register(cors);
    await app.register(helmet);

    // 2. Register real-time communication support
    await app.register(require("@fastify/websocket"));

    // 3. Register Redis client (needed for rate limit and services)
    await app.register(redisPlugin);

    // Start Matching Worker (after Redis is initialized)
    app.ready(async err => {
        if (err) throw err;
        const matchingWorker = new MatchingWorker(app.redis);
        matchingWorker.start();
        
        // Connect Kafka Producer
        await kafkaProducer.connect().catch(console.error);
        
        // Initialize Kafka Consumer
        const consumer = new KafkaConsumer("uber-backend-group", app.redis);
        for (const [topic, handler] of Object.entries(handlers)) {
            consumer.registerHandler(topic, handler);
        }
        await consumer.start().catch(console.error);
        
        // Graceful shutdown hooks
        app.addHook('onClose', async (instance, done) => {
            await kafkaProducer.disconnect();
            await consumer.disconnect();
            matchingWorker.stop();
            done();
        });
    });

    // 4. Register core utilities & auth decorators (order matters!)
    await app.register(jwtPlugin);
    await app.register(authPlugin);
    await app.register(rateLimitPlugin);
    await app.register(swaggerPlugin);

    // 4. Register WebSocket endpoint
    await app.register(socketRoutes);

    // 5. Register modular feature routes with exact prefix mappings
    await app.register(authRoutes, {
        prefix: "/api/v1/auth",
    });
    await app.register(usersRoutes, {
        prefix: "/api/v1/users",
    });
    await app.register(driversRoutes, {
        prefix: "/api/v1/drivers",
    });
    await app.register(tripsRoutes, {
        prefix: "/api/v1/trips",
    });
    await app.register(pricingRoutes, {
        prefix: "/api/v1/pricing",
    });
    await app.register(matchingRoutes, {
        prefix: "/api/v1/matching",
    });

    // Root status probe
    app.get("/", async () => {
        return {
            message: "Uber Backend Running",
        };
    });

    return app;
}

module.exports = buildApp;