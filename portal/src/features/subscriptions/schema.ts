import { z } from "zod";

export const subscriptionPlanTypeOptions = [
  "monthly",
  "quarterly",
  "yearly",
  "lifetime",
  "custom",
] as const;

// Numeric-ish fields are kept as plain strings here (matching how the inputs
// bind) and converted to numbers/null in api.ts when building the payload.
// This avoids the same input/output-divergence issue z.coerce/.optional()
// combos can cause with zodResolver.
export const subscriptionPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  type: z.enum(subscriptionPlanTypeOptions),
  price: z.string().min(1, "Price is required"),
  durationDays: z.string(),
  trialDays: z.string(),
  maxRidesPerDay: z.string(),
  sortOrder: z.string(),
  isActive: z.boolean(),
  razorpayPlanId: z.string(),
  featuresText: z.string(),
  vehicleTypeIds: z.array(z.string()),
});

export type SubscriptionPlanFormValues = z.infer<typeof subscriptionPlanSchema>;

export const emptySubscriptionPlanFormValues: SubscriptionPlanFormValues = {
  name: "",
  type: "monthly",
  price: "",
  durationDays: "30",
  trialDays: "0",
  maxRidesPerDay: "",
  sortOrder: "0",
  isActive: true,
  razorpayPlanId: "",
  featuresText: "",
  vehicleTypeIds: [],
};