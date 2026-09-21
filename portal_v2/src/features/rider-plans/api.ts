import { apiClient } from "@/lib/api-client";
import type {
  RiderPlan,
  RiderPlanListParams,
  CreateRiderPlanPayload,
  UpdateRiderPlanPayload,
  LookupOption,
} from "./types";

const BASE_URL = "/rider-plans/plans";

function buildQuery(params: RiderPlanListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  return query.toString();
}

export const riderPlansApi = {
  // GET /rider-plans/plans/all?page=&limit=&countryId=&isActive=  (Admin)
  list: (params: RiderPlanListParams) =>
    apiClient.get<RiderPlan[]>(`${BASE_URL}/all?${buildQuery(params)}`),

  // POST /rider-plans/plans  (Admin)
  create: (payload: CreateRiderPlanPayload) => apiClient.post<RiderPlan>(BASE_URL, payload),

  // PATCH /rider-plans/plans/:id  (Admin) — partial fields
  update: (id: string, payload: UpdateRiderPlanPayload) =>
    apiClient.patch<RiderPlan>(`${BASE_URL}/${id}`, payload),

  // PATCH /rider-plans/plans/:id/enable | /disable  (Admin)
  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<RiderPlan>(`${BASE_URL}/${id}/${isActive ? "enable" : "disable"}`, {}),
};

export const lookupsApi = {
  // GET /geo/countries  (Public)
  listCountries: () => apiClient.get<LookupOption[]>("/geo/countries"),
};
