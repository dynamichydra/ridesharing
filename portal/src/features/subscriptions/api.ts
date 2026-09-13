import { apiClient } from "@/lib/api-client";
import type {
  SubscriptionPlan,
  SubscriptionPlanListParams,
  CreateSubscriptionPlanPayload,
  UpdateSubscriptionPlanPayload,
  LookupOption,
  SubscriptionPlanVersion,
  DriverSubscriber,
  SubscriberListParams,
  SubscriptionDetail,
  SubscriptionAnalytics,
} from "./types";

const BASE_URL = "/subscriptions/plans";

function buildQuery(params: SubscriptionPlanListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  return query.toString();
}

export const subscriptionPlansApi = {
  list: (params: SubscriptionPlanListParams) =>
    apiClient.get<SubscriptionPlan[]>(`${BASE_URL}/all?${buildQuery(params)}`),

  // GET /subscriptions/plans/:id (Full plan details, entitlements, vehicle types, group pricing, active subscribers)
  getById: (id: string) =>
    apiClient.get<SubscriptionPlan>(`${BASE_URL}/${id}`),

  // GET /subscriptions/plans/:id/versions
  listVersions: (id: string) =>
    apiClient.get<SubscriptionPlanVersion[]>(`${BASE_URL}/${id}/versions`),

  // POST /subscriptions/plans  (Admin)
  create: (payload: CreateSubscriptionPlanPayload) =>
    apiClient.post<SubscriptionPlan>(BASE_URL, payload),

  // PATCH /subscriptions/plans/:id  (Admin) — partial fields
  update: (id: string, payload: UpdateSubscriptionPlanPayload) =>
    apiClient.patch<SubscriptionPlan>(`${BASE_URL}/${id}`, payload),

  // PATCH /subscriptions/plans/:id/enable | /disable  (Admin)
  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<SubscriptionPlan>(`${BASE_URL}/${id}/${isActive ? "enable" : "disable"}`, {}),

  // Public/Active plans for a country
  listActive: (countryId?: string) =>
    apiClient.get<SubscriptionPlan[]>(`/subscriptions/plans${countryId ? `?countryId=${countryId}` : ""}`),

  // Driver on-behalf-of Subscription (Admin)
  initiateDriverSub: (driverId: string, planId: string) =>
    apiClient.post<any>(`/subscriptions/admin/drivers/${driverId}/initiate`, { planId }),

  verifyDriverSub: (driverId: string, payload: { planId: string; orderRef: string; paymentRef: string; signature?: string }) =>
    apiClient.post<any>(`/subscriptions/admin/drivers/${driverId}/verify`, payload),
};

export const subscribersApi = {
  // GET /subscriptions/admin/subscribers?status=&planId=&countryId=&search=&page=&limit=
  list: (params: SubscriberListParams = {}) => {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 10));
    if (params.status) query.set("status", params.status);
    if (params.planId) query.set("planId", params.planId);
    if (params.countryId) query.set("countryId", params.countryId);
    if (params.search) query.set("search", params.search);
    return apiClient.get<DriverSubscriber[]>(`/subscriptions/admin/subscribers?${query.toString()}`);
  },

  // GET /subscriptions/admin/subscriptions/:id
  getById: (id: string) =>
    apiClient.get<SubscriptionDetail>(`/subscriptions/admin/subscriptions/${id}`),

  // POST /subscriptions/admin/subscriptions/:id/pause
  pause: (id: string, reason?: string) =>
    apiClient.post<any>(`/subscriptions/admin/subscriptions/${id}/pause`, { reason }),

  // POST /subscriptions/admin/subscriptions/:id/resume
  resume: (id: string) =>
    apiClient.post<any>(`/subscriptions/admin/subscriptions/${id}/resume`, {}),

  // POST /subscriptions/admin/subscriptions/:id/cancel
  cancel: (id: string, reason?: string) =>
    apiClient.post<any>(`/subscriptions/admin/subscriptions/${id}/cancel`, { reason }),

  // GET /subscriptions/admin/analytics
  getAnalytics: () =>
    apiClient.get<SubscriptionAnalytics>("/subscriptions/admin/analytics"),
};

export const planGroupPricingApi = {
  list: (planId: string) =>
    apiClient.get<any>(`${BASE_URL}/${planId}/group-pricing`),

  set: (planId: string, payload: any) =>
    apiClient.post<any>(`${BASE_URL}/${planId}/group-pricing`, payload),

  delete: (planId: string, pricingId: string) =>
    apiClient.delete<any>(`${BASE_URL}/${planId}/group-pricing/${pricingId}`),
};

export const lookupsApi = {
  // GET /geo/countries  (Public)
  listCountries: () => apiClient.get<LookupOption[]>("/geo/countries"),

  // GET /vehicle-types  (Public)
  listVehicleTypes: () => apiClient.get<LookupOption[]>("/vehicle-types"),

  // GET /driver-groups  (Admin)
  listDriverGroups: () => apiClient.get<any>("/driver-groups?limit=100&isActive=true"),
};

