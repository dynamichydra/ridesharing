import { apiClient } from "@/lib/api-client";
import type { Dispute, DisputeListParams, UpdateDisputeNotesPayload } from "./types";

const BASE_URL = "/disputes";

function buildQuery(params: DisputeListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.status) query.set("status", params.status);
  if (params.gateway) query.set("gateway", params.gateway);
  return query.toString();
}

export const disputesApi = {
  // GET /disputes?status=&gateway=&page=&limit=  (Admin)
  list: (params: DisputeListParams = {}) =>
    apiClient.get<Dispute[]>(`${BASE_URL}?${buildQuery(params)}`),

  // GET /disputes/:id  (Admin)
  getById: (id: string) => apiClient.get<Dispute>(`${BASE_URL}/${id}`),

  // PATCH /disputes/:id  { adminNotes }  (Admin) — triage notes only, never touches the
  // processor (accepting/contesting a dispute is out of scope for this admin surface).
  updateNotes: (id: string, payload: UpdateDisputeNotesPayload) =>
    apiClient.patch<Dispute>(`${BASE_URL}/${id}`, payload),
};
