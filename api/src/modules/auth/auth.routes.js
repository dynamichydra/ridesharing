const AuthController = require("./auth.controller");
const { validateBody } = require("../common/validation.middleware");
const { registerSchema, loginSchema } = require("./auth.validation");

async function authRoutes(app) {
    app.post(
        "/register",
        {
            preHandler: validateBody(registerSchema),
        },
        AuthController.register
    );

    app.post(
        "/login",
        {
            preHandler: validateBody(loginSchema),
        },
        AuthController.login
    );
}

module.exports = authRoutes;
