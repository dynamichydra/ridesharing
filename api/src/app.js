const Fastify = require("fastify");
const cors = require("@fastify/cors");
const helmet = require("@fastify/helmet");

// Import Plugins
const jwtPlugin = require("./plugins/jwt");
const authPlugin = require("./plugins/auth");
const swaggerPlugin = require("./plugins/swagger");

// Import Feature Routes
const socketRoutes = require("./modules/common/socket.routes");
const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const driversRoutes = require("./modules/drivers/drivers.routes");
const tripsRoutes = require("./modules/trips/trips.routes");

async function buildApp() {
    const app = Fastify({
        logger: true,
    });

    // 1. Register base security and sharing middlewares
    await app.register(cors);
    await app.register(helmet);

    // 2. Register real-time communication support
    await app.register(require("@fastify/websocket"));

    // 3. Register core utilities & auth decorators (order matters!)
    await app.register(jwtPlugin);
    await app.register(authPlugin);
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

    // Root status probe
    app.get("/", async () => {
        return {
            message: "Uber Backend Running",
        };
    });

    return app;
}

module.exports = buildApp;