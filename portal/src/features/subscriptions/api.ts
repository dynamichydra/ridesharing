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

  // DELETE /subscriptions/plans/:id  (Admin) — soft delete
  remove: (id: string) => apiClient.delete(`${BASE_URL}/${id}`),
};


export const lookupsApi = {
  // GET /geo/countries  (Public)
  listCountries: () => apiClient.get<LookupOption[]>("/geo/countries"),
};
