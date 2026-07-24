import { apiClient } from "@/lib/api-client";
import type {
  FlaggedTrip,
  FlaggedTripListParams,
  ApproveFlaggedTripPayload,
  AdjustFlaggedTripPayload,
} from "./types";

const BASE_URL = "/flagged-trips";

function buildQuery(params: FlaggedTripListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.status) query.set("status", params.status);
  return query.toString();
}

export const flaggedTripsApi = {
  // GET /flagged-trips?status=&page=&limit=  (Admin)
  list: (params: FlaggedTripListParams = {}) =>
    apiClient.get<FlaggedTrip[]>(`${BASE_URL}?${buildQuery(params)}`),

  // PATCH /flagged-trips/:id/approve  { note? }  (Admin) — bills the GPS-recomputed actual fare
  approve: (id: string, payload: ApproveFlaggedTripPayload) =>
    apiClient.patch<FlaggedTrip>(`${BASE_URL}/${id}/approve`, payload),

  // PATCH /flagged-trips/:id/adjust  { adjustedFareMinor, note? }  (Admin) — bills a manually-set amount
  adjust: (id: string, payload: AdjustFlaggedTripPayload) =>
    apiClient.patch<FlaggedTrip>(`${BASE_URL}/${id}/adjust`, payload),
};
