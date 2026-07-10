import { z } from "zod";

export const fareRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  ruleType: z.enum(["time", "zone", "traffic", "custom"], {
    message: "Rule type is required",
  }),
  multiplier: z.coerce.number().positive("Multiplier must be greater than 0"),
  description: z.string().optional(),
  zoneId: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().optional(),
});

export type FareRuleFormValues = z.infer<typeof fareRuleSchema>;