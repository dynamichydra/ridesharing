import { apiClient } from "@/lib/api-client";
import type {
  Rider,
  RiderListParams,
  CreateRiderPayload,
  UpdateRiderPayload,
  RiderDetail,
  RiderRide,
  RiderSubscriptionHistoryRow,
  RiderPlanPaymentRow,
} from "./types";

// Base path: /riders
const BASE_URL = "/riders";
const RIDER_PLANS_BASE_URL = "/rider-plans";

function buildQuery(params: RiderListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.isVerified !== undefined) query.set("isVerified", String(params.isVerified));
  if (params.isBlocked !== undefined) query.set("isBlocked", String(params.isBlocked));
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.stateId) query.set("stateId", params.stateId);
  if (params.cityId) query.set("cityId", params.cityId);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  return query.toString();
}

export const ridersApi = {
  // GET /riders?search=&isVerified=&isBlocked=&countryId=&stateId=&cityId=&page=&limit=  (Admin)
  list: (params: RiderListParams) => apiClient.get<Rider[]>(`${BASE_URL}?${buildQuery(params)}`),

  // GET /riders/:id  (Admin) — aggregated summary view: { rider, rideStats } — NOT a flat Rider.
  getById: (id: string) => apiClient.get<RiderDetail>(`${BASE_URL}/${id}`),

  // GET /riders/:id/rides?page=&limit=  (Admin)
  getRides: (id: string, page = 1, limit = 5) =>
    apiClient.get<RiderRide[]>(`${BASE_URL}/${id}/rides?page=${page}&limit=${limit}`),

  // POST /riders  (Admin) { phone, name, ... } — doc body is abbreviated;
  // email/isVerified carried over from the pre-existing implementation, not newly invented.
  create: (payload: CreateRiderPayload) => apiClient.post<Rider>(BASE_URL, payload),

  // PATCH /riders/:id  (Admin) partial fields
  update: (id: string, payload: UpdateRiderPayload) =>
    apiClient.patch<Rider>(`${BASE_URL}/${id}`, payload),
};

export const riderSubscriptionsApi = {
  // GET /rider-plans/admin/riders/:riderId/history?page=&limit=  (Admin)
  getHistory: (riderId: string, page = 1, limit = 10) =>
    apiClient.get<RiderSubscriptionHistoryRow[]>(
      `${RIDER_PLANS_BASE_URL}/admin/riders/${riderId}/history?page=${page}&limit=${limit}`,
    ),

  // GET /rider-plans/admin/riders/:riderId/payments?page=&limit=  (Admin)
  getPayments: (riderId: string, page = 1, limit = 10) =>
    apiClient.get<RiderPlanPaymentRow[]>(
      `${RIDER_PLANS_BASE_URL}/admin/riders/${riderId}/payments?page=${page}&limit=${limit}`,
    ),
};