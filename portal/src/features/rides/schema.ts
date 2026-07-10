import { z } from "zod";

// No create/edit form exists for rides on the admin side (read-only monitoring
// feature — the API has no admin write endpoints for rides). This schema backs
// the filter bar instead, which is the form.tsx equivalent for this feature.
export const rideStatusOptions = [
  "requested",
  "searching",
  "accepted",
  "arriving",
  "started",
  "completed",
  "cancelled",
  "expired",
] as const;

// NOTE: no .optional()/.default() here on purpose — mixing those on a
// z.enum() makes zod's input type and output type diverge (input allows
// undefined, output doesn't), which breaks zodResolver<RideFilterValues>
// type inference in form.tsx. Keep this schema's input/output identical;
// the "" default is supplied via useForm's defaultValues instead.
export const rideFilterSchema = z.object({
  status: z.enum(["", ...rideStatusOptions]),
});

export type RideFilterValues = z.infer<typeof rideFilterSchema>;