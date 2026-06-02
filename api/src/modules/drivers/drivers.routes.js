const DriversController = require("./drivers.controller");
const { validateBody } = require("../common/validation.middleware");
const {
    becomeDriverSchema,
    updateLocationSchema,
} = require("./drivers.validation");

async function driversRoutes(app) {
    app.post(
        "/become-driver",
        {
            preHandler: [
                app.authenticate("rider"),
                validateBody(becomeDriverSchema),
            ],
        },
        DriversController.becomeDriver
    );

    app.post(
        "/online",
        {
            preHandler: app.authenticate("DRIVER"),
        },
        DriversController.goOnline
    );

    app.post(
        "/offline",
        {
            preHandler: app.authenticate("DRIVER"),
        },
        DriversController.goOffline
    );

    app.get(
        "/me/status",
        {
            preHandler: app.authenticate("DRIVER"),
        },
        DriversController.getMyStatus
    );

    app.patch(
        "/location",
        {
            preHandler: [
                app.authenticate("DRIVER"),
                validateBody(updateLocationSchema),
            ],
        },
        DriversController.updateLocation
    );

    app.get(
        "/my-offers",
        {
            preHandler: app.authenticate("DRIVER"),
        },
        DriversController.getMyOffers
    );
}

module.exports = driversRoutes;
