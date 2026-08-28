import { apiClient } from "@/lib/api-client";
import type {
  Promo,
  PromoListParams,
  CreatePromoPayload,
  UpdatePromoPayload,
} from "./types";

const BASE_URL = "/promos";

function buildQuery(params: PromoListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.isActive !== undefined && params.isActive !== "") {
    query.set("isActive", String(params.isActive));
  }
  return query.toString();
}

export const promosApi = {
  list: (params: PromoListParams = {}) =>
    apiClient.get<Promo[]>(`${BASE_URL}?${buildQuery(params)}`),

  create: (payload: CreatePromoPayload) =>
    apiClient.post<Promo>(BASE_URL, payload),

  update: (id: string, payload: UpdatePromoPayload) =>
    apiClient.patch<Promo>(`${BASE_URL}/${id}`, payload),
};
