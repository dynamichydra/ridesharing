export type SubscriptionPlanType = "monthly" | "quarterly" | "yearly" | "lifetime";


export interface SubscriptionPlan {
  id: string;
  name: string;
  type: SubscriptionPlanType;
  countryId: string;
  currencyCode: string;
  priceMinor: number;
  durationDays: number | null; 
  trialDays: number;
  features: string[] | null;
  maxRidesPerDay: number | null;
  priorityMatching: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  vehicleTypeIds?: string[] | null;
  gateway?: string | null;
  gatewayPlanId?: string | null;
}

export interface SubscriptionPlanListParams {
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

export interface CreateSubscriptionPlanPayload {
  name: string;
  countryId: string;
  type: SubscriptionPlanType;
  currencyCode: string;
  priceMinor: number;
  durationDays: number | null;
  trialDays: number;
  features: string[];
  vehicleTypeIds: string[] | null;
  maxRidesPerDay: number | null;
  priorityMatching: boolean;
  sortOrder: number;
}

export type UpdateSubscriptionPlanPayload = Partial<CreateSubscriptionPlanPayload>;

export interface LookupOption {
  id: string;
  name: string;
}
