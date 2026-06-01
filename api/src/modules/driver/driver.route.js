const authenticate =
    require(
        "../../middlewares/auth.middleware"
    );

const controller =
    require(
        "./driver.controller"
    );

async function driverRoutes(
    app
) {
    app.post(
        "/become-driver",
        {
            preHandler:
                authenticate(
                    "rider"
                ),
        },
        controller.becomeDriver
    );

    app.patch(
        "/online",
        {
            preHandler:
                authenticate(
                    "DRIVER"
                ),
        },
        controller.goOnline
    );

    app.patch(
        "/offline",
        {
            preHandler:
                authenticate(
                    "DRIVER"
                ),
        },
        controller.goOffline
    );

    app.patch(
        "/status",
        {
            preHandler:
                authenticate(
                    "DRIVER"
                ),
        },
        controller.updateStatus
    );

    app.patch(
        "/location",
        {
            preHandler:
                authenticate(
                    "DRIVER"
                ),
        },
        controller.updateLocation
    );
    app.get(
        "/my-offers",
        {
            preHandler:
                authenticate(
                    "DRIVER"
                ),
        },
        controller.getMyOffers
    );
}

module.exports =
    driverRoutes;