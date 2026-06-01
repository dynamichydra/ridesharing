const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../db");
const { users } = require("../../db/schema/users.schema");

const { eq } = require("drizzle-orm");

const registerUser = async (payload) => {
    const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, payload.email));

    if (existingUser.length) {
        throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(
        payload.password,
        10
    );

    const [newUser] = await db
        .insert(users)
        .values({
            fullName: payload.fullName,
            email: payload.email,
            password: hashedPassword,
        })
        .returning();

    const token = jwt.sign(
        {
            userId: newUser.id,
            role: newUser.role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN,
        }
    );

    return {
        user: newUser,
        token,
    };
};

const loginUser = async (payload) => {
    const user = await db
        .select()
        .from(users)
        .where(eq(users.email, payload.email));

    if (!user.length) {
        throw new Error("Invalid credentials");
    }

    const isPasswordCorrect =
        await bcrypt.compare(
            payload.password,
            user[0].password
        );

    if (!isPasswordCorrect) {
        throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
        {
            userId: user[0].id,
            role: user[0].role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN,
        }
    );

    return {
        user: user[0],
        token,
    };
};

module.exports = {
    registerUser,
    loginUser,
};