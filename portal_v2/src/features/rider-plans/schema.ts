import { z } from "zod";

export const riderPlanTypeOptions = ["monthly", "quarterly", "yearly", "lifetime"] as const;

export const riderPlanSchema = z
  .object({
    name: z.string().min(1, { message: "Plan name is required" }),
    countryId: z.string().min(1, { message: "Country is required" }),
    type: z.enum(riderPlanTypeOptions, { message: "Plan type is required" }),
    currencyCode: z.string().min(1, { message: "Currency is required" }),
    priceMinor: z
      .number({ message: "Price is required" })
      .positive({ message: "Price must be greater than 0" }),
    durationDays: z.string(),
    trialDays: z
      .number({ message: "Trial days is required" })
      .min(0, { message: "Trial days can't be negative" }),
    featuresText: z.string(),
    sortOrder: z.number({ message: "Sort order is required" }),
  })
  .superRefine((values, ctx) => {
    if (values.type !== "lifetime" && !values.durationDays.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Duration is required unless the plan is Lifetime",
        path: ["durationDays"],
      });
    }
  });

export type RiderPlanFormValues = z.infer<typeof riderPlanSchema>;

export const emptyRiderPlanFormValues: RiderPlanFormValues = {
  name: "",
  countryId: "",
  type: "monthly",
  currencyCode: "",
  priceMinor: 0,
  durationDays: "30",
  trialDays: 0,
  featuresText: "",
  sortOrder: 1,
};
