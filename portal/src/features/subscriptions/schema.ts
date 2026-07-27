import { z } from "zod";

export const subscriptionPlanTypeOptions = ["monthly", "quarterly", "yearly", "lifetime"] as const;


export const subscriptionPlanSchema = z
  .object({
    name: z.string().min(1, { message: "Plan name is required" }),
    countryId: z.string().min(1, { message: "Country is required" }),
    type: z.enum(subscriptionPlanTypeOptions, { message: "Plan type is required" }),
    currencyCode: z.string().min(1, { message: "Currency is required" }),
    priceMinor: z.coerce
      .number({ message: "Price is required" })
      .positive({ message: "Price must be greater than 0" }),
    durationDays: z.string(),
    trialDays: z.coerce.number({ message: "Trial days is required" }).min(0, {
      message: "Trial days can't be negative",
    }),
    features: z.array(z.string().min(1).max(100)).max(20, {
      message: "At most 20 feature entries are allowed",
    }),
    vehicleTypeIds: z.array(z.string()),
    maxRidesPerDay: z.string(),
    priorityMatching: z.boolean(),
    sortOrder: z.coerce.number({ message: "Sort order is required" }),
  })
  .superRefine((values, ctx) => {
    if (values.type !== "lifetime" && !values.durationDays.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Duration is required unless the plan is Lifetime",
        path: ["durationDays"],
      });
    }
    if (values.maxRidesPerDay.trim()) {
      const n = Number(values.maxRidesPerDay);
      if (!Number.isInteger(n) || n < 0) {
        ctx.addIssue({
          code: "custom",
          message: "Max rides per day must be a non-negative whole number",
          path: ["maxRidesPerDay"],
        });
      }
    }
  });

export type SubscriptionPlanFormValues = z.infer<typeof subscriptionPlanSchema>;

export const emptySubscriptionPlanFormValues: SubscriptionPlanFormValues = {
  name: "",
  countryId: "",
  type: "monthly",
  currencyCode: "",
  priceMinor: 0,
  durationDays: "30",
  trialDays: 0,
  features: [],
  vehicleTypeIds: [],
  maxRidesPerDay: "",
  priorityMatching: false,
  sortOrder: 1,
};
