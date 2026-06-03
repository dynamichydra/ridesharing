const MatchingController = require("./matching.controller");

async function matchingRoutes(app) {
    /**
     * POST /matching/start/:tripId
     */
    app.post(
        "/start/:tripId",
        {
            preHandler: [
                app.authenticate("RIDER")
            ]
        },
        MatchingController.startMatching
    );

    /**
     * GET /matching/status/:tripId
     */
    app.get(
        "/status/:tripId",
        {
            preHandler: [
                app.authenticate("RIDER")
            ]
        },
        MatchingController.getMatchingStatus
    );
}

module.exports = matchingRoutes;
