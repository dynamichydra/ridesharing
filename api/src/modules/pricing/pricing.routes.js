const PricingController = require("./pricing.controller");
const { validateBody } = require("../common/validation.middleware");
const { estimatePricingSchema } = require("./pricing.validation");

async function pricingRoutes(app) {
    /**
     * POST /pricing/estimate
     * Returns industrial-level fare calculation.
     */
    app.post(
        "/estimate",
        {
            preHandler: [
                // Depending on requirements, we can enforce RIDER auth here.
                // app.authenticate("RIDER"),
                validateBody(estimatePricingSchema)
            ]
        },
        PricingController.estimateFare
    );
}

module.exports = pricingRoutes;
