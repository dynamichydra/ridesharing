import type { GeoJSONPolygon } from "./types";

/**
 * Extracts and normalizes a GeoJSON Polygon from various common GeoJSON input shapes
 * (FeatureCollection, Feature, MultiPolygon, or raw Polygon).
 */
export function extractPolygonFromGeoJSON(raw: any): GeoJSONPolygon | null {
  if (!raw || typeof raw !== "object") return null;

  // Case 1: Direct Polygon
  if (raw.type === "Polygon" && Array.isArray(raw.coordinates) && raw.coordinates.length > 0) {
    return {
      type: "Polygon",
      coordinates: raw.coordinates,
    };
  }

  // Case 2: Feature with Polygon or MultiPolygon geometry
  if (raw.type === "Feature" && raw.geometry) {
    return extractPolygonFromGeoJSON(raw.geometry);
  }

  // Case 3: FeatureCollection
  if (raw.type === "FeatureCollection" && Array.isArray(raw.features) && raw.features.length > 0) {
    for (const feat of raw.features) {
      const extracted = extractPolygonFromGeoJSON(feat);
      if (extracted) return extracted;
    }
  }

  // Case 4: MultiPolygon (extract outer polygon ring of the primary polygon)
  if (raw.type === "MultiPolygon" && Array.isArray(raw.coordinates) && raw.coordinates.length > 0) {
    return {
      type: "Polygon",
      coordinates: raw.coordinates[0],
    };
  }

  return null;
}

/**
 * Parses raw JSON string and extracts a valid GeoJSON Polygon.
 * Returns { polygon, error, sourceType }
 */
export function parseGeoJSONPolygonInput(input: string): {
  polygon: GeoJSONPolygon | null;
  error: string | null;
  sourceType?: string;
} {
  if (!input || !input.trim()) {
    return { polygon: null, error: "Polygon coordinates are required" };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(input.trim());
  } catch {
    return { polygon: null, error: "Invalid JSON syntax. Please check for formatting errors." };
  }

  const polygon = extractPolygonFromGeoJSON(parsed);
  if (!polygon) {
    return {
      polygon: null,
      error: "Could not find a valid Polygon geometry in the provided GeoJSON.",
    };
  }

  // Validate coordinates structure: number[][][]
  const coords = polygon.coordinates;
  if (!Array.isArray(coords) || coords.length === 0 || !Array.isArray(coords[0]) || coords[0].length < 3) {
    return {
      polygon: null,
      error: "Polygon must have at least 3 coordinate points forming a closed loop.",
    };
  }

  return { polygon, error: null, sourceType: parsed.type };
}
