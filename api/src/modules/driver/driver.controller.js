const driverService =
    require(
        "./driver.service"
    );

const becomeDriver =
    async (
        req,
        reply
    ) => {
        try {
            const result =
                await driverService.becomeDriver(
                    req.user.userId,
                    req.body
                );

            return reply
                .code(201)
                .send(result);
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

const goOnline =
    async (
        req,
        reply
    ) => {
        try {
            const result =
                await driverService.updateDriverStatus(
                    req.user.userId,
                    "ONLINE"
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

const goOffline =
    async (
        req,
        reply
    ) => {
        try {
            const result =
                await driverService.updateDriverStatus(
                    req.user.userId,
                    "OFFLINE"
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

const updateStatus =
    async (
        req,
        reply
    ) => {
        try {
            const {
                status,
            } = req.body;

            const result =
                await driverService.updateDriverStatus(
                    req.user.userId,
                    status
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

const updateLocation =
    async (
        req,
        reply
    ) => {
        try {
            const {
                latitude,
                longitude,
            } = req.body;

            const result =
                await driverService.updateDriverLocation(
                    req.user.userId,
                    latitude,
                    longitude
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

const getMyOffers =
    async (
        req,
        reply
    ) => {
        try {
            const result =
                await driverService.getMyOffers(
                    req.user.userId,
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
    becomeDriver,
    goOnline,
    goOffline,
    updateStatus,
    updateLocation,
    getMyOffers
};