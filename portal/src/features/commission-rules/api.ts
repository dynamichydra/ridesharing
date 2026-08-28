import { apiClient } from "@/lib/api-client";
import type {
  CommissionRule,
  CommissionRuleListParams,
  CreateCommissionRulePayload,
  UpdateCommissionRulePayload,
} from "./types";

const BASE_URL = "/commission-rules";

function buildQuery(params: CommissionRuleListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.isActive !== undefined && params.isActive !== "") {
    query.set("isActive", String(params.isActive));
  }
  return query.toString();
}

export const commissionRulesApi = {
  list: (params: CommissionRuleListParams = {}) =>
    apiClient.get<CommissionRule[]>(`${BASE_URL}?${buildQuery(params)}`),

  getById: (id: string) => apiClient.get<CommissionRule>(`${BASE_URL}/${id}`),

  create: (payload: CreateCommissionRulePayload) =>
    apiClient.post<CommissionRule>(BASE_URL, payload),

  update: (id: string, payload: UpdateCommissionRulePayload) =>
    apiClient.patch<CommissionRule>(`${BASE_URL}/${id}`, payload),

  enable: (id: string) =>
    apiClient.patch<CommissionRule>(`${BASE_URL}/${id}/enable`, {}),

  disable: (id: string) =>
    apiClient.patch<CommissionRule>(`${BASE_URL}/${id}/disable`, {}),
};
