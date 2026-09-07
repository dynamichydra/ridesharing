import { apiClient } from "@/lib/api-client";
import type {
  SubscriptionPlan,
  SubscriptionPlanListParams,
  CreateSubscriptionPlanPayload,
  UpdateSubscriptionPlanPayload,
  LookupOption,
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

