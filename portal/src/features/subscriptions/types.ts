export type SubscriptionPlanType = "monthly" | "quarterly" | "yearly" | "lifetime" | "custom";

export interface SubscriptionPlan {
  id: string;
  name: string;
  type: SubscriptionPlanType;
  price: string;
  durationDays: number | null;
  trialDays: number;
  features: string[] | null;
  vehicleTypeIds: string[] | null;
  maxRidesPerDay: number | null;
  sortOrder: number;
  isActive: boolean;
  razorpayPlanId: string | null;
}

export interface VehicleTypeOption {
  id: string;
  name: string;
}

export interface SubscriptionPlanListParams {
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

export interface SubscriptionPlanListResult {
  data: SubscriptionPlan[];
  pagination: Pagination;
}

export interface CreateSubscriptionPlanPayload {
  name: string;
  type: SubscriptionPlanType;
  price: string;
  durationDays: number | null;
  trialDays: number;
  maxRidesPerDay: number | null;
  sortOrder: number;
  isActive: boolean;
  razorpayPlanId: string | null;
  features: string[];
  vehicleTypeIds: string[];
}

export type UpdateSubscriptionPlanPayload = Partial<CreateSubscriptionPlanPayload>;

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