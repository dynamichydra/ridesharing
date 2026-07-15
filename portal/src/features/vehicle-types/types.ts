export interface VehicleType {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  capacity: number;
  sortOrder: number;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleTypeListParams {
  page?: number;
  limit?: number;
  [key: string]: any; 
}


export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}


export interface CreateVehicleTypePayload {
  name: string;
  capacity: number;
  sortOrder: number;
}


export interface UpdateVehicleTypePayload {
  capacity?: number;
  isActive?: boolean;
}
