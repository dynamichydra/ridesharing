import { apiClient } from "@/lib/api-client";
import type {
  CommissionRule,
  CommissionRuleListParams,
  CreateCommissionRulePayload,
  UpdateCommissionRulePayload,
  LookupOption,
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

interface RawCommissionRuleRow {
  rule?: CommissionRule;
  vehicleType?: { id: string; name: string; slug?: string } | null;
  country?: { id: string; name: string; isoCode?: string; currencyCode?: string } | null;
  id?: string;
  name?: string;
  subscriberRate?: string | number;
  nonSubscriberRate?: string | number;
  bookingFeeMinor?: number;
  priority?: number;
  isActive?: boolean;
}

export const commissionRulesApi = {
  list: async (params: CommissionRuleListParams = {}) => {
    const res = await apiClient.get<RawCommissionRuleRow[]>(`${BASE_URL}?${buildQuery(params)}`);
    const unwrapped: CommissionRule[] = (res.MESSAGE ?? []).map((item) => {
      if (item.rule) {
        return {
          ...item.rule,
          country: item.country ?? item.rule.country ?? null,
          vehicleType: item.vehicleType ?? item.rule.vehicleType ?? null,
        };
      }
      return item as CommissionRule;
    });
    return { ...res, MESSAGE: unwrapped };
  },

  getById: (id: string) => apiClient.get<CommissionRule>(`${BASE_URL}/${id}`),

  create: (payload: CreateCommissionRulePayload) =>
    apiClient.post<CommissionRule>(BASE_URL, payload),

  update: (id: string, payload: UpdateCommissionRulePayload) =>
    apiClient.patch<CommissionRule>(`${BASE_URL}/${id}`, payload),

  enable: (id: string) =>
    apiClient.patch<CommissionRule>(`${BASE_URL}/${id}/enable`, {}),

  disable: (id: string) =>
    apiClient.patch<CommissionRule>(`${BASE_URL}/${id}/disable`, {}),

  listCountries: () => apiClient.get<LookupOption[]>("/geo/countries"),
  listVehicleTypes: () => apiClient.get<LookupOption[]>("/vehicle-types"),
};

