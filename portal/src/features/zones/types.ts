export interface Zone {
  id: string;
  countryId: string;
  name: string;
  type: string;
  polygon: string; 
  multiplier: number;
  description: string | null;
  isActive: boolean;
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
  polygon: string;
  multiplier?: number;
  description?: string;
}

export interface ZoneDetectPayload {
  lat: number;
  lng: number;
}

export interface Country {
  id: string;
  name: string;
  isoCode: string;
  currencyCode: string;
}
