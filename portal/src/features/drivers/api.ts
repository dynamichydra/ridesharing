import { apiClient } from "@/lib/api-client";
import type {
  Driver,
  DriverDetail,
  DriverListParams,
  ApproveDriverPayload,
  RejectDriverPayload,
  RequestDocumentsPayload,
  DriverDocument,
  DocumentType,
  VerifyDocumentPayload,
} from "./types";

const BASE_URL = "/drivers";
const DOCUMENTS_BASE_URL = "/documents";

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

  // GET /drivers/:id  (Admin) — aggregated registration-summary view:
  // { driver, vehicles, documents, answers, isComplete, missing } — NOT a flat Driver.
  getById: (id: string) => apiClient.get<DriverDetail>(`${BASE_URL}/${id}`),

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

export const documentsApi = {
  // GET /documents/admin/drivers/:driverId  (Admin) — uploaded docs with short-lived signed preview URLs
  getForDriver: (driverId: string) =>
    apiClient.get<DriverDocument[]>(`${DOCUMENTS_BASE_URL}/admin/drivers/${driverId}`),

  // POST /documents/admin/:docId/verify  (Admin) — { approve, rejectionReason? }
  verify: (docId: string, payload: VerifyDocumentPayload) =>
    apiClient.post<DriverDocument>(`${DOCUMENTS_BASE_URL}/admin/${docId}/verify`, payload),

  // GET /documents/admin/types  (Admin) — used to label a document's documentTypeId with its code
  listTypes: () =>
    apiClient.get<DocumentType[]>(`${DOCUMENTS_BASE_URL}/admin/types?page=1&limit=100`),
};
