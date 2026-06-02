const { z } = require("zod");

const becomeDriverSchema = z.object({
    licenseNumber: z.string().trim().min(3),
    vehicleType: z.string().trim().min(2),
    vehicleNumber: z.string().trim().min(3),
});

const updateLocationSchema = z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
});

module.exports = {
    becomeDriverSchema,
    updateLocationSchema,
};
