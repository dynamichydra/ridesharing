const fp = require("fastify-plugin");
const jwt = require("jsonwebtoken");

async function jwtPlugin(fastify, opts) {
    fastify.decorate("jwt", {
        sign: (payload, options = {}) => {
            return jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN || "1d",
                ...options,
            });
        },
        verify: (token) => {
            return jwt.verify(token, process.env.JWT_SECRET);
        },
    });
}

module.exports = fp(jwtPlugin);
