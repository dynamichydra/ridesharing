export type SubscriptionPlanType = "monthly" | "quarterly" | "yearly" | "lifetime";

export interface PlanEntitlements {
  commissionRate?: number | null;        // e.g. 0.05 for 5%
  priorityScoreBonus?: number | null;    // e.g. 0.25 for +0.25 dispatch score
  maxRidesPerDay?: number | null;
  waiveBookingFee?: boolean;
  customBookingFeeMinor?: number | null;
  freeInstantPayouts?: boolean;
  scheduledRidesAllowed?: boolean;
  supportLevel?: "standard" | "priority" | "dedicated";
  [key: string]: any;
}

export interface SubscriptionPlanVersion {
  id: string;
  planId: string;
  version: number;
  name: string;
  type: SubscriptionPlanType;
  currencyCode: string;
  priceMinor: number;
  durationDays: number | null;
  trialDays: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  gateway?: string | null;
  gatewayPlanId?: string | null;
  changeSummary?: string | null;
  createdAt: string;
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
  version?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  currentVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
  vehicleTypeIds?: string[] | null;
  gateway?: string | null;
  gatewayPlanId?: string | null;
  versions?: SubscriptionPlanVersion[] | null;
  versionCount?: number;
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

export type SubscriptionStatus =
  | "pending"
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled"
  | "expired"
  | "payment_failed"
  | "inactive";

export interface DriverSubscriber {
  id: string;
  driverId: string;
  planId: string;
  planVersionId?: string | null;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  pausedAt?: string | null;
  resumedAt?: string | null;
  autoRenew: boolean;
  amountMinor?: number | null;
  currencyCode?: string | null;
  cancelledAt?: string | null;
  cancelNote?: string | null;
  createdAt: string;
  updatedAt: string;
  driver: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    subscriptionStatus: string;
    approvalStatus: string;
    isBlocked: boolean;
    countryId?: string | null;
    cityId?: string | null;
  };
  plan: {
    id: string;
    name: string;
    type: SubscriptionPlanType;
    priceMinor: number;
    currencyCode: string;
    durationDays?: number | null;
    trialDays: number;
    countryId: string;
  };
  planVersion?: {
    id: string;
    version: number;
    name: string;
  } | null;
}

export interface SubscriberListParams {
  page?: number;
  limit?: number;
  status?: string;
  planId?: string;
  countryId?: string;
  search?: string;
}

export interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus: string;
  actorType: string;
  reason?: string | null;
  metadata?: any;
  createdAt: string;
}

export interface SubscriptionPaymentAttempt {
  id: string;
  subscriptionId?: string | null;
  driverId?: string | null;
  amountMinor: number;
  currencyCode: string;
  status: string;
  gateway?: string | null;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  createdAt: string;
}

export interface SubscriptionDetail extends DriverSubscriber {
  payments: SubscriptionPaymentAttempt[];
  events: SubscriptionEvent[];
}

export interface SubscriptionAnalytics {
  totalActive: number;
  totalPlans: number;
  expiringSoon: number;
  pastDue: number;
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
}
