const userService = require(
    "./user.service"
);

const getProfile =
    async (req, reply) => {
        try {
            const result =
                await userService.getMe(
                    req.user.userId
                );

            reply.send(result);
        } catch (error) {
            reply.code(400).send({
                message:
                    error.message,
            });
        }
    };

module.exports = {
    getProfile,
};