export interface VehicleType {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  capacity: number;
  baseRate: string;
  perKmRate: string;
  perMinRate: string;
  minFare: string;
  sortOrder: number;
  isActive: boolean;
}

export interface VehicleTypeListParams {
  page?: number;
  limit?: number;
}

// Real runtime shape (confirmed via Network tab on the Fare Rules page):
// currentPage/itemsPerPage/totalItems/totalPages — matches the API doc.
export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface VehicleTypePayload {
  name: string;
  slug: string;
  capacity: number;
  baseRate: string;
  perKmRate: string;
  perMinRate: string;
  minFare: string;
  sortOrder: number;
  isActive: boolean;
  icon?: string | null;
}

export type UpdateVehicleTypePayload = Partial<VehicleTypePayload>;