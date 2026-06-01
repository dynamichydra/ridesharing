const tripService =
    require(
        "./trip.service"
    );
const fareService =
    require(
        "./fare.service"
    );
const requestRide =
    async (
        req,
        reply
    ) => {
        try {
            const trip =
                await tripService.requestRide(
                    req.user.userId,
                    req.body
                );

            reply
                .code(201)
                .send(trip);
        } catch (
        error
        ) {
            reply.code(400)
                .send({
                    message:
                        error.message,
                });
        }
    };

const getMyTrips =
    async (
        req,
        reply
    ) => {
        const trips =
            await tripService.getMyTrips(
                req.user.userId
            );

        reply.send(
            trips
        );
    };
const getPendingTrips =
    async (
        req,
        reply
    ) => {
        const result =
            await tripService.getPendingTrips();

        reply.send(
            result
        );
    };
const acceptRide =
    async (
        req,
        reply
    ) => {
        try {
            const {
                tripId,
            } = req.params;

            const trip =
                await tripService.acceptRide(
                    req.user.userId,
                    tripId
                );

            return reply.send(
                trip
            );
        } catch (
        error
        ) {
            return reply
                .code(400)
                .send({
                    message:
                        error.message,
                });
        }
    };

const updateTripStatus =
    async (
        req,
        reply
    ) => {
        try {
            const {
                tripId,
                status,
            } =
                req.body;

            const trip =
                await tripService.updateTripStatus(
                    req.user.userId,
                    tripId,
                    status,
                    req.user.role
                );

            return reply.send(
                trip
            );
        } catch (
        error
        ) {
            return reply
                .code(400)
                .send({
                    message:
                        error.message,
                });
        }
    };

const estimateFare =
    async (
        req,
        reply
    ) => {
        try {
            const result =
                await fareService.estimateFare(
                    req.body.pickupLat,
                    req.body.pickupLng,
                    req.body.destinationLat,
                    req.body.destinationLng
                );

            return reply.send(
                result
            );
        } catch (
        error
        ) {
            return reply
                .code(400)
                .send({
                    message:
                        error.message,
                });
        }
    };
module.exports = {
    requestRide,
    getMyTrips,
    getPendingTrips,
    acceptRide,
    updateTripStatus,
    estimateFare,
};