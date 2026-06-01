const jwt = require("jsonwebtoken");

const authenticate =
    (...allowedRoles) =>
        async (req, reply) => {
            try {
                const authHeader =
                    req.headers.authorization;

                if (!authHeader) {
                    return reply.code(401).send({
                        message: "Unauthorized",
                    });
                }

                const token =
                    authHeader.split(" ")[1];

                const decoded = jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );

                req.user = decoded;
                console.log(decoded);
                                             
                if (
                    allowedRoles.length &&
                    !allowedRoles.includes(
                        decoded.role
                    )
                ) {
                    return reply.code(403).send({
                        message: "Forbidden",
                    });
                }
            } catch (error) {
                return reply.code(401).send({
                    message: "Invalid token",
                });
            }
        };

module.exports = authenticate;