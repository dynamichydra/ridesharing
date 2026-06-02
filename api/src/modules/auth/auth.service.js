const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AuthRepository = require("./auth.repository");

class AuthService {
    static async registerUser(payload) {
        const existingUsers = await AuthRepository.findByEmail(payload.email);

        if (existingUsers.length) {
            throw new Error("User already exists");
        }

        const hashedPassword = await bcrypt.hash(payload.password, 10);

        const newUser = await AuthRepository.createUser({
            fullName: payload.fullName,
            email: payload.email,
            password: hashedPassword,
        });

        const token = jwt.sign(
            {
                userId: newUser.id,
                role: newUser.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "1d",
            }
        );

        return {
            user: newUser,
            token,
        };
    }

    static async loginUser(payload) {
        const users = await AuthRepository.findByEmail(payload.email);

        if (!users.length) {
            throw new Error("Invalid credentials");
        }

        const user = users[0];
        const isPasswordCorrect = await bcrypt.compare(payload.password, user.password);

        if (!isPasswordCorrect) {
            throw new Error("Invalid credentials");
        }

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "1d",
            }
        );

        return {
            user,
            token,
        };
    }
}

module.exports = AuthService;