export type ZoneType = string;

export interface ZonePolygon {
  type: "Polygon";
  coordinates: number[][][];
}


export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  description: string | null;
  multiplier: string;
  polygon: ZonePolygon;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ZoneListParams {
  page?: number;
  limit?: number;
}


export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface ZonePayload {
  name: string;
  type: ZoneType;
  polygon: ZonePolygon;
  multiplier?: string;
  description?: string | null;
  isActive?: boolean;
}

export type UpdateZonePayload = Partial<ZonePayload>;