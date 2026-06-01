const getSurgeMultiplier =
    async () => {
        const hour =
            new Date().getHours();

        // rush hour
        if (
            hour >= 8 &&
            hour <= 10
        ) {
            return 1.4;
        }

        // office return
        if (
            hour >= 18 &&
            hour <= 21
        ) {
            return 1.6;
        }

        // night
        if (
            hour >= 23 ||
            hour <= 5
        ) {
            return 1.3;
        }

        return 1;
    };

module.exports = {
    getSurgeMultiplier,
};