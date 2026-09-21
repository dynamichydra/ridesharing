import { z } from "zod";

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


export const rideFilterSchema = z.object({
  status: z.enum(["", ...rideStatusOptions]),
});

export type RideFilterValues = z.infer<typeof rideFilterSchema>;
