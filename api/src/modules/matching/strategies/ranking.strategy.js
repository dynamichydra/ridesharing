const CONSTANTS = require("../matching.constants");

class RankingStrategy {
    /**
     * Ranks drivers using a weighted scoring model.
     * @param {Array} drivers - List of driver objects from repository/redis
     * @returns {Array} Sorted list of drivers (highest score first)
     */
    static rank(drivers) {
        if (!drivers || drivers.length === 0) return [];

        // Normalize distance (max distance in this batch)
        const maxDistance = Math.max(...drivers.map(d => d.distanceKm || 1));

        const scoredDrivers = drivers.map(driver => {
            // Distance Score: closer is better (1 - normalized_distance)
            const distanceScore = 1 - ((driver.distanceKm || 0) / maxDistance);
            
            // Rating Score: normalize 5.0 scale to 0-1
            const ratingScore = (driver.rating || 5.0) / 5.0;

            // Mocks for historical data (if DB doesn't have it yet)
            // In a full production setup, these come from `driver_statistics`
            const acceptanceScore = driver.acceptanceRate || 0.9;
            const completionScore = driver.completionRate || 0.95;

            // Weighted Sum
            const totalScore = 
                (distanceScore * CONSTANTS.WEIGHTS.DISTANCE) +
                (ratingScore * CONSTANTS.WEIGHTS.RATING) +
                (acceptanceScore * CONSTANTS.WEIGHTS.ACCEPTANCE_RATE) +
                (completionScore * CONSTANTS.WEIGHTS.COMPLETION_RATE);

            return {
                ...driver,
                score: totalScore
            };
        });

        // Sort descending by score
        return scoredDrivers.sort((a, b) => b.score - a.score);
    }
}

module.exports = RankingStrategy;
