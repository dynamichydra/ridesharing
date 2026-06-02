const UsersService = require("./users.service");

class UsersController {
    static async getProfile(req, reply) {
        try {
            const result = await UsersService.getMe(req.user.userId);
            return reply.send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }
}

module.exports = UsersController;
