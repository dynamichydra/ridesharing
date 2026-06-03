const { z } = require("zod");

const estimatePricingSchema = z.object({
    pickup_lat: z.number().min(-90).max(90),
    pickup_lng: z.number().min(-180).max(180),
    destination_lat: z.number().min(-90).max(90),
    destination_lng: z.number().min(-180).max(180),
    vehicle_type: z.enum(["BIKE", "AUTO", "MINI", "SEDAN", "SUV", "PREMIUM", "UBER_GO", "UBER_X"]),
});

module.exports = {
    estimatePricingSchema,
};
