const AuthController = require("./auth.controller");
const { validateBody } = require("../common/validation.middleware");
const { registerSchema, loginSchema } = require("./auth.validation");

async function authRoutes(app) {
    app.post(
        "/register",
        {
            config: {
                rateLimit: { max: 30, window: 60 }
            },
            preHandler: validateBody(registerSchema),
        },
        AuthController.register
    );

    app.post(
        "/login",
        {
            config: {
                rateLimit: { max: 30, window: 60 }
            },
            preHandler: validateBody(loginSchema),
        },
        AuthController.login
    );
}

module.exports = authRoutes;
