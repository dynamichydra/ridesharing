const db = require("../../db");

const { users } = require(
    "../../db/schema/users.schema"
);

const { eq } = require(
    "drizzle-orm"
);

const getMe = async (
    userId
) => {
    const [user] = await db
        .select({
            id: users.id,
            fullName:
                users.fullName,
            email: users.email,
            role: users.role,
            isVerified:
                users.isVerified,
            createdAt:
                users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId));

    return user;
};

module.exports = {
    getMe,
};