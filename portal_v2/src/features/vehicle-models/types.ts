export interface VehicleModel {
  id: string;
  vehicleTypeId: string;
  brand: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleModelListParams {
  page?: number;
  limit?: number;
  vehicleTypeId?: string;
  [key: string]: any;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface CreateVehicleModelPayload {
  vehicleTypeId: string;
  brand: string;
  name: string;
  sortOrder?: number;
}

export interface UpdateVehicleModelPayload {
  vehicleTypeId?: string;
  brand?: string;
  name?: string;
  sortOrder?: number;
}

// Used only to populate the vehicle-type dropdown in the form/filters — not the full VehicleType shape.
export interface VehicleTypeOption {
  id: string;
  name: string;
}
