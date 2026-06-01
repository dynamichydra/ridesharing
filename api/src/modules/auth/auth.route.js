const authController = require(
    "./auth.controller"
);

async function authRoutes(app) {
    app.post(
        "/register",
        authController.register
    );

    app.post(
        "/login",
        authController.login
    );
}

module.exports = authRoutes;