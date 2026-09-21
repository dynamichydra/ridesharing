import { apiClient } from "@/lib/api-client";
import type {
  LostItem,
  LostItemListParams,
  UpdateLostItemStatusPayload,
} from "./types";

const BASE_URL = "/lost-items";

function buildQuery(params: LostItemListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.status) query.set("status", params.status);
  if (params.rideId) query.set("rideId", params.rideId);
  return query.toString();
}

export const lostItemsApi = {
  listAdmin: (params: LostItemListParams = {}) =>
    apiClient.get<LostItem[]>(`${BASE_URL}/admin?${buildQuery(params)}`),

  updateStatus: (id: string, payload: UpdateLostItemStatusPayload) =>
    apiClient.patch<LostItem>(`${BASE_URL}/${id}/status`, payload),
};
