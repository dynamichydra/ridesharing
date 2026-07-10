export interface Rider {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  avatar: string | null;
  isVerified: boolean;
  isBlocked: boolean;
  rating: string;
  totalRides: string;
  createdAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RiderListParams {
  search?: string;
  isVerified?: boolean;
  isBlocked?: boolean;
  page?: number;
  limit?: number;
}

export interface RiderListResponse {
  data: Rider[];
  pagination: Pagination;
}

export interface CreateRiderPayload {
  name: string;
  phone: string;
  email?: string;
  isVerified?: boolean;
}

export type UpdateRiderPayload = Partial<
  Pick<Rider, "name" | "email" | "isVerified" | "isBlocked">
>;

export interface ApiResponse<T> {
  SUCCESS: boolean;
  MESSAGE: T;
  COUNT?: number;
  PAGINATION?: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
  };
}