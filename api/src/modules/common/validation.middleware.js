const validateBody = (schema) => async (req, reply) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return reply.code(400).send({
            message: "Validation failed",
            errors: result.error.errors,
        });
    }
    req.body = result.data;
};

module.exports = {
    validateBody,
};
