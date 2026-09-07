export type SubscriptionPlanType = "monthly" | "quarterly" | "yearly" | "lifetime";

export interface PlanEntitlements {
  commissionRate?: number | null;        // e.g. 0.05 for 5%
  priorityScoreBonus?: number | null;    // e.g. 0.25 for +0.25 dispatch score
  maxRidesPerDay?: number | null;
  freeInstantPayouts?: boolean;
  [key: string]: any;
}

export interface PlanGroupPricing {
  id: string;
  planId: string;
  groupId: string;
  groupName: string;
  groupCode: string;
  specialPriceMinor?: number | null;
  discountPercent?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SetPlanGroupPricingPayload {
  groupId: string;
  specialPriceMinor?: number | null;
  discountPercent?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}

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
  entitlements?: PlanEntitlements | null;
  allowedGroupIds?: string[] | null;
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
  allowedGroupIds?: string[] | null;
  maxRidesPerDay: number | null;
  priorityMatching: boolean;
  entitlements?: PlanEntitlements | null;
  sortOrder: number;
}

export type UpdateSubscriptionPlanPayload = Partial<CreateSubscriptionPlanPayload>;

export interface LookupOption {
  id: string;
  name: string;
}

