import { apiClient } from "@/lib/api-client";
import type {
  FareRule,
  FareRuleListParams,
  FareRulePayload,
  UpdateFareRulePayload,
} from "./types";

// Base path: /fare — rule CRUD lives under /fare/rules (Admin only)
const BASE_URL = "/fare/rules";

function buildQuery(params: FareRuleListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.ruleType) query.set("ruleType", params.ruleType);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  return query.toString();
}

export const fareRulesApi = {
  // GET /fare/rules?page=&limit=&...  (Admin)
  list: (params: FareRuleListParams) =>
    apiClient.get<FareRule[]>(`${BASE_URL}?${buildQuery(params)}`),

  // GET /fare/rules/:id  (Admin)
  getById: (id: string) => apiClient.get<FareRule>(`${BASE_URL}/${id}`),

  // POST /fare/rules  (Admin) { name, ruleType, multiplier, ... }
  create: (payload: FareRulePayload) => apiClient.post<FareRule>(BASE_URL, payload),

  // PATCH /fare/rules/:id  (Admin) partial fields
  update: (id: string, payload: UpdateFareRulePayload) =>
    apiClient.patch<FareRule>(`${BASE_URL}/${id}`, payload),

  // DELETE /fare/rules/:id  (Admin)
  remove: (id: string) => apiClient.delete(`${BASE_URL}/${id}`),
};