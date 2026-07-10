import { z } from "zod";

const polygonJsonSchema = z.string().min(1, "Polygon GeoJSON is required").refine(
  (value) => {
    try {
      const parsed = JSON.parse(value);
      return (
        parsed &&
        parsed.type === "Polygon" &&
        Array.isArray(parsed.coordinates) &&
        parsed.coordinates.length > 0
      );
    } catch {
      return false;
    }
  },
  {
    message:
      'Must be valid GeoJSON, e.g. { "type": "Polygon", "coordinates": [[[lng,lat], ...]] }',
  }
);

export const zoneFormSchema = z.object({
  name: z.string().min(1, "Zone name is required"),
  type: z.string().min(1, "Zone type is required"),
  multiplier: z.string().optional(),
  description: z.string().optional(),
  polygonText: polygonJsonSchema,
  isActive: z.boolean().optional(),
});

export type ZoneFormValues = z.infer<typeof zoneFormSchema>;