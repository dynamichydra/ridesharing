import { z } from "zod";

export const riderSchema = z.object({
  name: z.string().trim().min(1, "Full name is required"),

  phone: z
    .string()
    .trim()
    .min(10, "Enter a valid phone number")
    .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),

  email: z.union([
    z.string().trim().email("Enter a valid email address"),
    z.literal(""),
  ]),

  isVerified: z.boolean(),

  countryId: z.string().optional(),
  stateId: z.string().optional(),
  cityId: z.string().optional(),
});

export type RiderFormValues = z.infer<typeof riderSchema>;

export const emptyRiderFormValues: RiderFormValues = {
  name: "",
  phone: "",
  email: "",
  isVerified: false,
  countryId: "",
  stateId: "",
  cityId: "",
};