const AuthService = require("./auth.service");

class AuthController {
    static async register(req, reply) {
        try {
            const result = await AuthService.registerUser(req.body);
            return reply.code(201).send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }

    static async login(req, reply) {
        try {
            const result = await AuthService.loginUser(req.body);
            return reply.send(result);
        } catch (error) {
            return reply.code(400).send({
                message: error.message,
            });
        }
    }
}

module.exports = AuthController;