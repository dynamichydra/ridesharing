const { z } = require("zod");

const becomeDriverSchema = z.object({
    licenseNumber: z.string().min(3),
    vehicleType: z.string().min(2),
    vehicleNumber: z.string().min(3),
});

const updateStatusSchema = z.object({
    status: z.enum(["OFFLINE", "ONLINE", "BUSY", "ON_TRIP"]),
});

const updateLocationSchema = z.object({
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
});

module.exports = {
    becomeDriverSchema,
    updateStatusSchema,
    updateLocationSchema,
};
