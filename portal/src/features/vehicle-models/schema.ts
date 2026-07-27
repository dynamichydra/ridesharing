import { z } from "zod";

export const vehicleModelFormSchema = z.object({
  vehicleTypeId: z.string().min(1, { message: "Vehicle type is required" }),
  brand: z.string().trim().min(1, { message: "Brand is required" }),
  name: z.string().trim().min(1, { message: "Model name is required" }),
  sortOrder: z.coerce.number().int().min(0, { message: "Sort order must be zero or greater" }),
});

export type VehicleModelFormValues = z.infer<typeof vehicleModelFormSchema>;

export const emptyVehicleModelFormValues: VehicleModelFormValues = {
  vehicleTypeId: "",
  brand: "",
  name: "",
  sortOrder: 0,
};
