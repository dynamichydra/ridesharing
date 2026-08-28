import { apiClient } from "@/lib/api-client";
import type {
  SosAlert,
  SosAlertListParams,
  ResolveSosAlertPayload,
} from "./types";

const BASE_URL = "/admin/sos-alerts";

function buildQuery(params: SosAlertListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.status) query.set("status", params.status);
  if (params.userType) query.set("userType", params.userType);
  return query.toString();
}

export const sosAlertsApi = {
  list: (params: SosAlertListParams = {}) =>
    apiClient.get<SosAlert[]>(`${BASE_URL}?${buildQuery(params)}`),

  resolve: (id: string, payload: ResolveSosAlertPayload) =>
    apiClient.patch<SosAlert>(`${BASE_URL}/${id}/resolve`, payload),
};
