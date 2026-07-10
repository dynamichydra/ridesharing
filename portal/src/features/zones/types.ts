export type ZoneType = "city" | "large_city" | "suburb" | "airport" | "highway";

export interface ZonePolygon {
  type: string; // "Polygon"
  coordinates: number[][][];
}

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  polygon: ZonePolygon;
  multiplier: string;
  description: string | null;
  isActive: boolean;
}

export interface ZoneListParams {
  page?: number;
  limit?: number;
}

// Normalized pagination shape used throughout this feature.
// Raw API returns { currentPage, itemsPerPage, totalItems, totalPages } —
// api.ts maps that into this shape.
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ZoneListResult {
  data: Zone[];
  pagination: Pagination;
}

export interface CreateZonePayload {
  name: string;
  type: ZoneType;
  polygon: ZonePolygon;
  multiplier: string;
  description: string;
  isActive: boolean;
}

export type UpdateZonePayload = Partial<CreateZonePayload>;

export interface RawPagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  SUCCESS: boolean;
  MESSAGE: T;
  COUNT?: number;
  PAGINATION?: RawPagination;
}