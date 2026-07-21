import { apiClient } from "@/lib/api-client";
import type { RidePayment, RidePaymentListParams, RideInvoice } from "./types";

const BASE_URL = "/ride-payments";

function buildQuery(params: RidePaymentListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.status) query.set("status", params.status);
  if (params.gateway) query.set("gateway", params.gateway);
  if (params.paymentMethod) query.set("paymentMethod", params.paymentMethod);
  if (params.riderId) query.set("riderId", params.riderId);
  if (params.driverId) query.set("driverId", params.driverId);
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.rideId) query.set("rideId", params.rideId);
  return query.toString();
}

export const ridePaymentsApi = {
  // GET /ride-payments  (Admin) — Filters: status, gateway, paymentMethod, riderId, driverId, countryId, rideId
  list: (params: RidePaymentListParams = {}) =>
    apiClient.get<RidePayment[]>(`${BASE_URL}?${buildQuery(params)}`),

  // GET /ride-payments/:rideId/invoice  (Admin — any ride)
  getInvoice: (rideId: string) =>
    apiClient.get<RideInvoice>(`${BASE_URL}/${rideId}/invoice`),
};
