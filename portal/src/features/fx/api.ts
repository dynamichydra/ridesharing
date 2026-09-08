import { apiClient } from "@/lib/api-client";
import type {
  FxRate,
  FxRateListParams,
  CreateFxRatePayload,
  ConvertMoneyPayload,
  ConvertMoneyResponse,
} from "./types";

const BASE_URL = "/fx";

function buildQuery(params: FxRateListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.baseCurrency) query.set("baseCurrency", params.baseCurrency);
  if (params.quoteCurrency) query.set("quoteCurrency", params.quoteCurrency);
  return query.toString();
}

export const fxApi = {
  list: (params: FxRateListParams = {}) =>
    apiClient.get<FxRate[]>(`${BASE_URL}/admin/rates?${buildQuery(params)}`),

  create: (payload: CreateFxRatePayload) =>
    apiClient.post<FxRate>(`${BASE_URL}/admin/rates`, payload),

  delete: (id: string) =>
    apiClient.delete(`${BASE_URL}/admin/rates/${id}`),

  getRate: (base: string, quote: string) =>
    apiClient.get<{ baseCurrency: string; quoteCurrency: string; rate: number }>(
      `${BASE_URL}/rate?base=${base}&quote=${quote}`
    ),

  convert: (payload: ConvertMoneyPayload) =>
    apiClient.post<ConvertMoneyResponse>(`${BASE_URL}/convert`, payload),
};
