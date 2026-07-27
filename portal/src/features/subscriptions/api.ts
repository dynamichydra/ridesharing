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
};


export const lookupsApi = {
  // GET /geo/countries  (Public)
  listCountries: () => apiClient.get<LookupOption[]>("/geo/countries"),

  // GET /vehicle-types  (Public)
  listVehicleTypes: () => apiClient.get<LookupOption[]>("/vehicle-types"),
};
