import { z } from "zod";

export const zoneSchema = z.object({
  countryId: z.string().min(1, "Country is required"),
  cityId: z.string().optional(),
  name: z.string().min(1, "Zone name is required"),
  type: z.string().min(1, "Zone type is required"),
  multiplier: z
    .string()
    .min(1, "Multiplier is required")
    .regex(/^\d+(\.\d+)?$/, "Enter a valid decimal number")
    .transform((val) => parseFloat(val)),
  airportFee: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+(\.\d+)?$/.test(val), "Enter a valid fee amount"),
  pickupFee: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+(\.\d+)?$/.test(val), "Enter a valid fee amount"),
  dropoffFee: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+(\.\d+)?$/.test(val), "Enter a valid fee amount"),
  description: z.string().optional(),
  polygon: z.string().min(1, "Polygon coordinates are required"),
  // H3 resolution (8-10) — optional; leaving it blank leaves hex indexing untouched.
  resolution: z
    .string()
    .optional()
    .refine((val) => !val || /^(8|9|10)$/.test(val), "Resolution must be 8, 9, or 10"),
  priority: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), "Priority must be a whole number"),
});

export type ZoneFormValues = z.infer<typeof zoneSchema>;

export const generateHexSchema = z.object({
  resolution: z
    .string()
    .min(1, "Resolution is required")
    .regex(/^(8|9|10)$/, "Resolution must be 8, 9, or 10")
    .transform((val) => parseInt(val, 10)),
});

export type GenerateHexFormValues = z.infer<typeof generateHexSchema>;

export const zoneDetectSchema = z.object({
  lat: z
    .string()
    .min(1, "Latitude is required")
    .regex(/^-?\d+(\.\d+)?$/, "Must be a valid latitude decimal")
    .transform((val) => parseFloat(val)),
  lng: z
    .string()
    .min(1, "Longitude is required")
    .regex(/^-?\d+(\.\d+)?$/, "Must be a valid longitude decimal")
    .transform((val) => parseFloat(val)),
});

export type ZoneDetectFormValues = z.infer<typeof zoneDetectSchema>;
