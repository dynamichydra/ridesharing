const authenticate =
    require(
        "../../middlewares/auth.middleware"
    );

const controller =
    require(
        "./trip.controller"
    );

async function tripRoutes(
    app
) {
    app.post(
        "/request",
        {
            preHandler:
                authenticate(
                    "RIDER"
                ),
        },
        controller.requestRide
    );

    app.get(
        "/my-trips",
        {
            preHandler:
                authenticate(
                    "RIDER"
                ),
        },
        controller.getMyTrips
    );
    app.get(
        "/pending",
        {
            preHandler:
                authenticate(
                    "DRIVER"
                ),
        },
        controller.getPendingTrips
    );
    app.patch(
        "/accept/:tripId",
        {
            preHandler:
                authenticate(
                    "DRIVER"
                ),
        },
        controller.acceptRide
    );
    app.patch(
        "/status",
        {
            preHandler:
                authenticate(
                    "DRIVER",
                    "RIDER"
                ),
        },
        controller.updateTripStatus
    );
    app.post(
        "/fare-estimate",
        {
            preHandler:
                authenticate(
                    "RIDER"
                ),
        },
        controller.estimateFare
    );
}
module.exports =
    tripRoutes;