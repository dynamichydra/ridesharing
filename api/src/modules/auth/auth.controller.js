const authService = require("./auth.service");

const register = async (req, reply) => {
    try {
        const result =
            await authService.registerUser(
                req.body
            );

        reply.code(201).send(result);
    } catch (error) {
        reply.code(400).send({
            message: error.message,
        });
    }
};

const login = async (req, reply) => {
    try {
        const result =
            await authService.loginUser(
                req.body
            );

        reply.send(result);
    } catch (error) {
        reply.code(400).send({
            message: error.message,
        });
    }
};

module.exports = {
    register,
    login,
};