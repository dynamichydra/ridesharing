const { z } = require("zod");

// Route param schemas

const tripIdParamSchema = z.object({
    id: z.string().uuid("Trip ID must be a valid UUID"),
});

// Request body schemas

const requestRideSchema = z.object({
    pickupAddress: z.string().min(3),
    pickupLat: z.coerce.number(),
    pickupLng: z.coerce.number(),
    destinationAddress: z.string().min(3),
    destinationLat: z.coerce.number(),
    destinationLng: z.coerce.number(),
    vehicleType: z.string().min(2),
});

const estimateFareSchema = z.object({
    pickupLat: z.coerce.number(),
    pickupLng: z.coerce.number(),
    destinationLat: z.coerce.number(),
    destinationLng: z.coerce.number(),
});

const cancelTripBodySchema = z
    .object({
        reason: z.string().trim().min(1).max(500).optional(),
    })
    .default({});

module.exports = {
    tripIdParamSchema,
    requestRideSchema,
    estimateFareSchema,
    cancelTripBodySchema,
};
