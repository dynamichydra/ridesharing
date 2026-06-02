const db = require("../../db/drizzle");
const { users } = require("../../db/schema/users.schema");
const { eq } = require("drizzle-orm");

class AuthRepository {
    static async findByEmail(email, tx = db) {
        const result = await tx
            .select()
            .from(users)
            .where(eq(users.email, email));
        return result;
    }

    static async createUser(userData, tx = db) {
        const [newUser] = await tx
            .insert(users)
            .values({
                fullName: userData.fullName,
                email: userData.email,
                password: userData.password,
            })
            .returning();
        return newUser;
    }
}

module.exports = AuthRepository;
