export type RiderPlanType = "monthly" | "quarterly" | "yearly" | "lifetime";

export interface RiderPlan {
  id: string;
  name: string;
  type: RiderPlanType;
  countryId: string;
  currencyCode: string;
  priceMinor: number;
  durationDays: number | null;
  trialDays: number;
  features: string[] | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  gateway?: string | null;
  gatewayPlanId?: string | null;
}

export interface RiderPlanListParams {
  page?: number;
  limit?: number;
  countryId?: string;
  isActive?: boolean;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface CreateRiderPlanPayload {
  name: string;
  countryId: string;
  type: RiderPlanType;
  currencyCode: string;
  priceMinor: number;
  durationDays: number | null;
  trialDays: number;
  features: string[];
  sortOrder: number;
}

export type UpdateRiderPlanPayload = Partial<CreateRiderPlanPayload>;

export interface LookupOption {
  id: string;
  name: string;
}
