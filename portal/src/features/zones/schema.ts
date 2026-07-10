import { z } from "zod";

export const zoneTypeOptions = [
  "city",
  "large_city",
  "suburb",
  "airport",
  "highway",
] as const;

const DEFAULT_COORDINATES_TEXT =
  "[[[88.34, 22.56], [88.39, 22.56], [88.39, 22.59], [88.34, 22.59], [88.34, 22.56]]]";

// coordinatesText is validated as a string here (must parse to a non-empty
// JSON array); the actual GeoJSON parsing/shape-check happens on submit in
// pages/index.tsx, same as the original page did, so the error message can
// reference the raw JSON parse failure directly.
export const zoneSchema = z.object({
  name: z.string().min(1, "Zone name is required"),
  type: z.enum(zoneTypeOptions),
  coordinatesText: z.string().min(1, "Polygon coordinates are required"),
  multiplier: z.string().min(1, "Multiplier is required"),
  description: z.string(),
  isActive: z.boolean(),
});

export type ZoneFormValues = z.infer<typeof zoneSchema>;

export const emptyZoneFormValues: ZoneFormValues = {
  name: "",
  type: "city",
  coordinatesText: DEFAULT_COORDINATES_TEXT,
  multiplier: "1.00",
  description: "",
  isActive: true,
};