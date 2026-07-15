import { apiClient } from "@/lib/api-client";
import type { Rider, RiderListParams, CreateRiderPayload, UpdateRiderPayload } from "./types";

// Base path: /riders
const BASE_URL = "/riders";

function buildQuery(params: RiderListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.isVerified !== undefined) query.set("isVerified", String(params.isVerified));
  if (params.isBlocked !== undefined) query.set("isBlocked", String(params.isBlocked));
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  return query.toString();
}

export const ridersApi = {
  // GET /riders?search=&isVerified=&isBlocked=&page=&limit=  (Admin)
  list: (params: RiderListParams) => apiClient.get<Rider[]>(`${BASE_URL}?${buildQuery(params)}`),

  // POST /riders  (Admin) { phone, name, ... } — doc body is abbreviated;
  // email/isVerified carried over from the pre-existing implementation, not newly invented.
  create: (payload: CreateRiderPayload) => apiClient.post<Rider>(BASE_URL, payload),

  // PATCH /riders/:id  (Admin) partial fields
  update: (id: string, payload: UpdateRiderPayload) =>
    apiClient.patch<Rider>(`${BASE_URL}/${id}`, payload),
};