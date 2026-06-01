const authenticate = require(
    "../../middlewares/auth.middleware"
);

const userController =
    require(
        "./user.controller"
    );

async function userRoutes(
    app
) {
    app.get(
        "/me",
        {
            preHandler:
                authenticate(),
        },
        userController.getProfile
    );
}

module.exports =
    userRoutes;