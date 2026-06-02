const { z } = require("zod");

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

const updateTripStatusSchema = z.object({
    tripId: z.string().uuid(),
    status: z.enum(["SEARCHING", "ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"]),
});

module.exports = {
    requestRideSchema,
    estimateFareSchema,
    updateTripStatusSchema,
};
