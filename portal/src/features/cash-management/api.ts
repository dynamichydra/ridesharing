import { apiClient } from "@/lib/api-client";
import type {
  CashCollection,
  CashDispute,
  CashListParams,
  ReportCashPayload,
} from "./types";

const BASE_URL = "/cash";

function buildQuery(params: CashListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.status) query.set("status", params.status);
  if (params.driverId) query.set("driverId", params.driverId);
  return query.toString();
}

export const cashApi = {
  listCollections: (params: CashListParams = {}) =>
    apiClient.get<CashCollection[]>(`${BASE_URL}/collections?${buildQuery(params)}`),

  reportCollection: (payload: ReportCashPayload) =>
    apiClient.post<CashCollection>(`${BASE_URL}/collections/report`, payload),

  listDisputes: (params: CashListParams = {}) =>
    apiClient.get<CashDispute[]>(`${BASE_URL}/disputes?${buildQuery(params)}`),
};
