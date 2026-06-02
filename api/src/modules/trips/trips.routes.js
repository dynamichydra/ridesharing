const TripsController = require("./trips.controller");
const { validateBody } = require("../common/validation.middleware");
const {
    requestRideSchema,
    estimateFareSchema,
    tripIdParamSchema,
    cancelTripBodySchema,
} = require("./trips.validation");

// Shared param guard

function validateTripIdParam(req, reply, done) {
    const result = tripIdParamSchema.safeParse(req.params);
    if (!result.success) {
        return reply.code(400).send({
            message: "Invalid trip ID",
            errors: result.error.flatten().fieldErrors,
        });
    }
    done();
}

// Route registration

async function tripsRoutes(app) {

    // Rider routes

    /** Create a new ride request (SEARCHING) */
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

    /** Get all trips for the authenticated rider */
    app.get(
        "/my-trips",
        { preHandler: app.authenticate("RIDER") },
        TripsController.getMyTrips
    );

    /** Fare estimate (does not create a trip) */
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

    // Driver routes

    /** List all trips in SEARCHING state (driver discovery feed) */
    app.get(
        "/pending",
        { preHandler: app.authenticate("DRIVER") },
        TripsController.getPendingTrips
    );

    /** SEARCHING -> DRIVER_ASSIGNED */
    app.post(
        "/:id/accept",
        {
            preHandler: [
                app.authenticate("DRIVER"),
                validateTripIdParam,
            ],
        },
        TripsController.acceptTrip
    );

    /** DRIVER_ASSIGNED -> DRIVER_ARRIVING */
    app.post(
        "/:id/arrived",
        {
            preHandler: [
                app.authenticate("DRIVER"),
                validateTripIdParam,
            ],
        },
        TripsController.driverArrived
    );

    /** DRIVER_ARRIVING -> STARTED */
    app.post(
        "/:id/start",
        {
            preHandler: [
                app.authenticate("DRIVER"),
                validateTripIdParam,
            ],
        },
        TripsController.startTrip
    );

    /** STARTED -> COMPLETED */
    app.post(
        "/:id/complete",
        {
            preHandler: [
                app.authenticate("DRIVER"),
                validateTripIdParam,
            ],
        },
        TripsController.completeTrip
    );

    // Rider lifecycle routes

    /**
     * Cancel a trip.
     * RIDER: SEARCHING | DRIVER_ASSIGNED | DRIVER_ARRIVING -> CANCELLED
     */
    app.post(
        "/:id/cancel",
        {
            preHandler: [
                app.authenticate("RIDER"),
                validateTripIdParam,
                validateBody(cancelTripBodySchema),
            ],
        },
        TripsController.cancelTrip
    );
}

module.exports = tripsRoutes;
