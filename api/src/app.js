const Fastify = require("fastify");
const cors = require("@fastify/cors");
const helmet = require("@fastify/helmet");

const authRoutes = require(
    "./modules/auth/auth.route"
);
const userRoutes = require(
    "./modules/user/user.route"
);
const driverRoutes =
    require(
        "./modules/driver/driver.route"
    );
const tripRoutes =
    require(
        "./modules/trip/trip.route"
    );
async function buildApp() {
    const app = Fastify({
        logger: true,
    });

    await app.register(cors);

    await app.register(helmet);
    app.register(
        require(
            "@fastify/websocket"
        )
    );
    app.register(
        require(
            "../src/socket/socket.route"
        )
    );
    await app.register(authRoutes, {
        prefix: "/api/v1/auth",
    });
    await app.register(
        userRoutes,
        {
            prefix:
                "/api/v1/users",
        }
    );
    await app.register(
        driverRoutes,
        {
            prefix:
                "/api/v1/drivers",
        }
    );
    await app.register(
        tripRoutes,
        {
            prefix:
                "/api/v1/trips",
        }
    );
    app.get("/", async () => {
        return {
            message: "Uber Backend Running",
        };
    });

    return app;
}

module.exports = buildApp;