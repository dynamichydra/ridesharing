const UsersController = require("./users.controller");

async function usersRoutes(app) {
    app.get(
        "/me",
        {
            preHandler: app.authenticate(),
        },
        UsersController.getProfile
    );
}

module.exports = usersRoutes;
