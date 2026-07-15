import { z } from "zod";

export const vehicleTypeCreateSchema = z.object({
  name: z.string().min(1, { message: "Vehicle type name is required" }),
  capacity: z.coerce
    .number({ message: "Capacity is required" })
    .int()
    .gt(0, { message: "Capacity must be greater than zero" }),
  sortOrder: z.coerce
    .number({ message: "Sort order is required" })
    .int()
    .min(0, { message: "Sort order must be zero or greater" }),
});

export type VehicleTypeCreateValues = z.infer<typeof vehicleTypeCreateSchema>;

export const vehicleTypeEditSchema = z.object({
  capacity: z.coerce
    .number({ message: "Capacity is required" })
    .int()
    .gt(0, { message: "Capacity must be greater than zero" }),
  isActive: z.boolean(),
});

export type VehicleTypeEditValues = z.infer<typeof vehicleTypeEditSchema>;


export interface VehicleTypeFormValues {
  name: string;
  capacity: number | "";
  sortOrder: number | "";
  isActive: boolean;
}
