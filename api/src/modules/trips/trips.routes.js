const TripsController = require("./trips.controller");
const { validateBody } = require("../common/validation.middleware");
const {
    requestRideSchema,
    estimateFareSchema,
    updateTripStatusSchema,
} = require("./trips.validation");

async function tripsRoutes(app) {
    app.post(
        "/request",
        {
            preHandler: [
                app.authenticate("RIDER"),
                validateBody(requestRideSchema),
            ],
        },
        TripsController.requestRide
    );

    app.get(
        "/my-trips",
        {
            preHandler: app.authenticate("RIDER"),
        },
        TripsController.getMyTrips
    );

    app.get(
        "/pending",
        {
            preHandler: app.authenticate("DRIVER"),
        },
        TripsController.getPendingTrips
    );

    app.patch(
        "/accept/:tripId",
        {
            preHandler: app.authenticate("DRIVER"),
        },
        TripsController.acceptRide
    );

    app.patch(
        "/status",
        {
            preHandler: [
                app.authenticate("DRIVER", "RIDER"),
                validateBody(updateTripStatusSchema),
            ],
        },
        TripsController.updateTripStatus
    );

    app.post(
        "/fare-estimate",
        {
            preHandler: [
                app.authenticate("RIDER"),
                validateBody(estimateFareSchema),
            ],
        },
        TripsController.estimateFare
    );
}

module.exports = tripsRoutes;
