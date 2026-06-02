const UsersRepository = require("./users.repository");

class UsersService {
    static async getMe(userId) {
        return UsersRepository.findById(userId);
    }
}

module.exports = UsersService;
