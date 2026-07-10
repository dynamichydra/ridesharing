import { z } from "zod";

export const vehicleTypeSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  slug: z.string().min(1, "Slug is required"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  baseRate: z.string().min(1, "Base rate is required"),
  perKmRate: z.string().min(1, "Per KM rate is required"),
  perMinRate: z.string().optional(),
  minFare: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type VehicleTypeFormValues = z.infer<typeof vehicleTypeSchema>;