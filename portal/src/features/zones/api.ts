import { apiClient } from "@/lib/api-client";
import type { Zone, ZoneListParams, ZonePayload, UpdateZonePayload } from "./types";

// Base path: /zones — geofenced pricing zones (city centre, airport, etc)
const BASE_URL = "/zones";

function buildQuery(params: ZoneListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  return query.toString();
}

export const zonesApi = {
  // GET /zones?page=&limit=  (Public)
  list: (params: ZoneListParams) => apiClient.get<Zone[]>(`${BASE_URL}?${buildQuery(params)}`),

  // GET /zones/:id  (Public)
  getById: (id: string) => apiClient.get<Zone>(`${BASE_URL}/${id}`),

  // POST /zones  (Admin) { name, type, polygon, multiplier?, description? }
  create: (payload: ZonePayload) => apiClient.post<Zone>(BASE_URL, payload),

  // PATCH /zones/:id  (Admin) partial fields
  update: (id: string, payload: UpdateZonePayload) =>
    apiClient.patch<Zone>(`${BASE_URL}/${id}`, payload),

  // DELETE /zones/:id  (Admin)
  remove: (id: string) => apiClient.delete(`${BASE_URL}/${id}`),
};