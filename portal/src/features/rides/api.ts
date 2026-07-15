import { apiClient } from "@/lib/api-client";
import type { Ride, RideListParams, RideTimelineEvent, RideOffer } from "./types";

const BASE_URL = "/rides";

function buildQuery(params: RideListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.status) query.set("status", params.status);
  if (params.driverId) query.set("driverId", params.driverId);
  if (params.riderId) query.set("riderId", params.riderId);
  return query.toString();
}

export const ridesApi = {
  // GET /rides  (Admin) — Filters: status, driverId, riderId
  list: (params: RideListParams = {}) =>
    apiClient.get<Ride[]>(`${BASE_URL}?${buildQuery(params)}`),

  // GET /rides/:id/history/admin  (Admin) — full status-change timeline for any ride
  getTimelineAdmin: (rideId: string) =>
    apiClient.get<RideTimelineEvent[]>(`${BASE_URL}/${rideId}/history/admin`),

  // GET /rides/:id/offers/admin  (Admin) — full broadcast/offer history for any ride
  getOffersAdmin: (rideId: string) =>
    apiClient.get<RideOffer[]>(`${BASE_URL}/${rideId}/offers/admin`),
};
