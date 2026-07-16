import { z } from "zod";

export const zoneSchema = z.object({
  countryId: z.string().min(1, "Country is required"),
  name: z.string().min(1, "Zone name is required"),
  type: z.string().min(1, "Zone type is required"),
  multiplier: z
    .string()
    .min(1, "Multiplier is required")
    .regex(/^\d+(\.\d+)?$/, "Enter a valid decimal number")
    .transform((val) => parseFloat(val)),
  description: z.string().optional(),
  polygon: z.string().min(1, "Polygon coordinates are required"),
});

export type ZoneFormValues = z.infer<typeof zoneSchema>;

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
