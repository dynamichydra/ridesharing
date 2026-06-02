class TripsSurgeService {
    static async getSurgeMultiplier() {
        const hour = new Date().getHours();

        // Morning rush hour
        if (hour >= 8 && hour <= 10) {
            return 1.4;
        }

        // Office return hour
        if (hour >= 18 && hour <= 21) {
            return 1.6;
        }

        // Late night
        if (hour >= 23 || hour <= 5) {
            return 1.3;
        }

        return 1.0;
    }
}

module.exports = TripsSurgeService;
