import { apiClient } from "@/lib/api-client";
import type {
  Driver,
  DriverListParams,
  ApproveDriverPayload,
  RejectDriverPayload,
  RequestDocumentsPayload,
} from "./types";

const BASE_URL = "/drivers";

function buildQuery(params: DriverListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.approvalStatus) query.set("approvalStatus", params.approvalStatus);
  if (params.subscriptionStatus) query.set("subscriptionStatus", params.subscriptionStatus);
  if (params.registrationStatus) query.set("registrationStatus", params.registrationStatus);
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.cityId) query.set("cityId", params.cityId);
  if (params.isBlocked !== undefined) query.set("isBlocked", String(params.isBlocked));
  return query.toString();
}

export const driversApi = {
  // GET /drivers?page=&limit=&approvalStatus=&...  (Admin)
  list: (params: DriverListParams) =>
    apiClient.get<Driver[]>(`${BASE_URL}?${buildQuery(params)}`),

  // GET /drivers/:id  (Admin) — aggregated registration-summary view
  getById: (id: string) => apiClient.get<Driver>(`${BASE_URL}/${id}`),

  // POST /drivers/:id/approve  (Admin)
  approve: (id: string, payload: ApproveDriverPayload) =>
    apiClient.post(`${BASE_URL}/${id}/approve`, payload),

  // POST /drivers/:id/reject  (Admin)
  reject: (id: string, payload: RejectDriverPayload) =>
    apiClient.post(`${BASE_URL}/${id}/reject`, payload),

  // POST /drivers/:id/block  (Admin)
  block: (id: string) => apiClient.post(`${BASE_URL}/${id}/block`, {}),

  // POST /drivers/:id/unblock  (Admin)
  unblock: (id: string) => apiClient.post(`${BASE_URL}/${id}/unblock`, {}),

  // POST /drivers/:id/request-documents  (Admin)
  requestDocuments: (id: string, payload: RequestDocumentsPayload) =>
    apiClient.post(`${BASE_URL}/${id}/request-documents`, payload),
};
