const db = require("../../db/drizzle");
const { users } = require("../../db/schema/users.schema");
const { eq } = require("drizzle-orm");

class UsersRepository {
    static async findById(id, tx = db) {
        const [user] = await tx
            .select({
                id: users.id,
                fullName: users.fullName,
                email: users.email,
                role: users.role,
                isVerified: users.isVerified,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.id, id));
        return user;
    }
}

module.exports = UsersRepository;
