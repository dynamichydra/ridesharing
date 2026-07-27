// The `zones.polygon` backend column is jsonb, and every backend consumer
// (detectZone/polygonToHexCells) reads `.coordinates` off it directly — the wire value must be
// a real object, never a JSON-encoded string (a string gets double-encoded by the jsonb driver
// and comes back unusable). `[lng, lat]` pairs per GeoJSON convention.
export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface Zone {
  id: string;
  countryId: string;
  name: string;
  type: string;
  polygon: GeoJSONPolygon;
  multiplier: number;
  description: string | null;
  isActive: boolean;
  hexCells: string[] | null;
  resolution: number | null;
  priority: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ZoneListParams {
  page?: number;
  limit?: number;
  countryId?: string;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface ZonePayload {
  name: string;
  countryId: string;
  type: string;
  polygon: GeoJSONPolygon;
  multiplier?: number;
  description?: string;
  // H3 hex-cell resolution (8-10) — when set on create/update, the backend derives
  // hexCells from `polygon` immediately. Omit to leave hex indexing untouched.
  resolution?: number;
  priority?: number;
}

export interface ZoneDetectPayload {
  lat: number;
  lng: number;
}

export interface GenerateHexCellsPayload {
  id: string;
  resolution: number;
}

export interface Country {
  id: string;
  name: string;
  isoCode: string;
  currencyCode: string;
}
