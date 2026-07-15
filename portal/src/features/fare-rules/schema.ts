import { z } from "zod";

// Base fields required for every rule type, plus every type-specific field
// declared optional at this level — enforced per-type in superRefine below.
// This keeps a single form/resolver instead of a discriminated union, which
// is simpler to wire into one shared form body.
export const fareRuleSchema = z
  .object({
    name: z.string().min(1, { message: "Rule name is required" }),
    countryId: z.string().min(1, { message: "Country is required" }),
    ruleType: z.enum(["time", "traffic", "zone"], { message: "Rule type is required" }),
    multiplier: z.coerce.number().positive({ message: "Multiplier must be greater than 0" }),
    priority: z.coerce.number().int({ message: "Priority must be a whole number" }),
    vehicleTypeId: z.string().min(1, { message: "Vehicle type is required" }),
    zoneId: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    daysOfWeek: z.array(z.coerce.number()).optional(),
    trafficDelayS: z.coerce.number().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.ruleType === "time") {
      if (!values.startTime) {
        ctx.addIssue({ code: "custom", message: "Start time is required", path: ["startTime"] });
      }
      if (!values.endTime) {
        ctx.addIssue({ code: "custom", message: "End time is required", path: ["endTime"] });
      }
      if (!values.daysOfWeek || values.daysOfWeek.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Select at least one day of the week",
          path: ["daysOfWeek"],
        });
      }
    }
    if (values.ruleType === "traffic") {
      if (values.trafficDelayS === undefined || values.trafficDelayS === null || Number.isNaN(values.trafficDelayS)) {
        ctx.addIssue({
          code: "custom",
          message: "Traffic delay (seconds) is required",
          path: ["trafficDelayS"],
        });
      }
    }
    if (values.ruleType === "zone") {
      if (!values.zoneId) {
        ctx.addIssue({ code: "custom", message: "Zone is required", path: ["zoneId"] });
      }
    }
  });

export type FareRuleFormValues = z.infer<typeof fareRuleSchema>;
