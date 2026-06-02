const fp = require("fastify-plugin");

async function swaggerPlugin(fastify, opts) {
    await fastify.register(require("@fastify/swagger"), {
        swagger: {
            info: {
                title: "Uber Rideshare Backend API",
                description: "Modular Fastify, Node.js, Drizzle, PostgreSQL ride-sharing REST & WebSocket API",
                version: "1.0.0",
            },
            host: `localhost:${process.env.PORT || 5000}`,
            schemes: ["http"],
            consumes: ["application/json"],
            produces: ["application/json"],
            securityDefinitions: {
                BearerAuth: {
                    type: "apiKey",
                    name: "Authorization",
                    in: "header",
                    description: 'Enter your token in the format "Bearer <token>"',
                },
            },
        },
    });

    await fastify.register(require("@fastify/swagger-ui"), {
        routePrefix: "/docs",
        uiConfig: {
            docExpansion: "list",
            deepLinking: false,
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
    });
}

module.exports = fp(swaggerPlugin);
