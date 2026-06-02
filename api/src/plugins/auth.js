const fp = require("fastify-plugin");

async function authPlugin(fastify, opts) {
    // Requires fastify.jwt to be registered
    if (!fastify.jwt) {
        throw new Error("authPlugin requires jwtPlugin to be registered first");
    }

    const authenticate = (...allowedRoles) => async (req, reply) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                return reply.code(401).send({
                    message: "Unauthorized",
                });
            }

            const token = authHeader.split(" ")[1];
            if (!token) {
                return reply.code(401).send({
                    message: "Unauthorized",
                });
            }

            const decoded = fastify.jwt.verify(token);
            req.user = decoded;

            // Perform case-insensitive role checking if roles are provided
            if (allowedRoles.length) {
                const userRole = (decoded.role || "").toUpperCase();
                const uppercaseAllowedRoles = allowedRoles.map((r) => r.toUpperCase());

                if (!uppercaseAllowedRoles.includes(userRole)) {
                    return reply.code(403).send({
                        message: "Forbidden",
                    });
                }
            }
        } catch (error) {
            return reply.code(401).send({
                message: "Invalid token",
            });
        }
    };

    fastify.decorate("authenticate", authenticate);
}

module.exports = fp(authPlugin);
