import { apiClient } from "@/lib/api-client";
import type {
  Driver,
  DriverDetail,
  DriverListParams,
  CreateDriverPayload,
  UpdateDriverPayload,
  ResetDriverPendingPayload,
  ApproveDriverPayload,
  RejectDriverPayload,
  RequestDocumentsPayload,
  DriverDocument,
  DocumentType,
  VerifyDocumentPayload,
  DriverSubscriptionHistoryRow,
  DriverPaymentRow,
  VehicleModelOption,
  DriverVehicle,
  AdminVehiclePayload,
} from "./types";

const BASE_URL = "/drivers";
const VEHICLES_BASE_URL = "/vehicles";
const DOCUMENTS_BASE_URL = "/documents";
const SUBSCRIPTIONS_BASE_URL = "/subscriptions";

function buildQuery(params: DriverListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.approvalStatus) query.set("approvalStatus", params.approvalStatus);
  if (params.subscriptionStatus) query.set("subscriptionStatus", params.subscriptionStatus);
  if (params.registrationStatus) query.set("registrationStatus", params.registrationStatus);
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.stateId) query.set("stateId", params.stateId);
  if (params.cityId) query.set("cityId", params.cityId);
  if (params.isBlocked !== undefined) query.set("isBlocked", String(params.isBlocked));
  if (params.search) query.set("search", params.search);
  return query.toString();
}

export const driversApi = {
  // GET /drivers?page=&limit=&approvalStatus=&...  (Admin)
  list: (params: DriverListParams) =>
    apiClient.get<Driver[]>(`${BASE_URL}?${buildQuery(params)}`),

  // POST /drivers  (Admin) — manual registration; only name + (phone or email) are required
  create: (payload: CreateDriverPayload) => apiClient.post<Driver>(BASE_URL, payload),

  // GET /drivers/:id  (Admin) — aggregated registration-summary view:
  // { driver, vehicles, documents, answers, isComplete, missing } — NOT a flat Driver.
  getById: (id: string) => apiClient.get<DriverDetail>(`${BASE_URL}/${id}`),

  // PATCH /drivers/:id  (Admin) — full edit on driver
  update: (id: string, payload: UpdateDriverPayload) =>
    apiClient.patch<Driver>(`${BASE_URL}/${id}`, payload),

  // POST /drivers/:id/pending  (Admin) — reset / set status to pending
  setPending: (id: string, payload?: ResetDriverPendingPayload) =>
    apiClient.post<Driver>(`${BASE_URL}/${id}/pending`, payload || {}),

  // POST /drivers/:id/approve  (Admin)
  approve: (id: string, payload?: ApproveDriverPayload) =>
    apiClient.post<Driver>(`${BASE_URL}/${id}/approve`, payload || {}),

  // POST /drivers/:id/reject  (Admin)
  reject: (id: string, payload: RejectDriverPayload) =>
    apiClient.post<Driver>(`${BASE_URL}/${id}/reject`, payload),

  // POST /drivers/:id/block  (Admin)
  block: (id: string) => apiClient.post(`${BASE_URL}/${id}/block`, {}),

  // POST /drivers/:id/unblock  (Admin)
  unblock: (id: string) => apiClient.post(`${BASE_URL}/${id}/unblock`, {}),

  // POST /drivers/:id/request-documents  (Admin)
  requestDocuments: (id: string, payload: RequestDocumentsPayload) =>
    apiClient.post(`${BASE_URL}/${id}/request-documents`, payload),
};

export const vehiclesApi = {
  // GET /vehicles/admin/drivers/:driverId
  listForDriver: (driverId: string) =>
    apiClient.get<DriverVehicle[]>(`${VEHICLES_BASE_URL}/admin/drivers/${driverId}`),

  // POST /vehicles/admin/drivers/:driverId
  add: (driverId: string, payload: AdminVehiclePayload) =>
    apiClient.post<DriverVehicle>(`${VEHICLES_BASE_URL}/admin/drivers/${driverId}`, payload),

  // PATCH /vehicles/admin/drivers/:driverId/:vehicleId
  update: (driverId: string, vehicleId: string, payload: Partial<AdminVehiclePayload>) =>
    apiClient.patch<DriverVehicle>(`${VEHICLES_BASE_URL}/admin/drivers/${driverId}/${vehicleId}`, payload),

  // DELETE /vehicles/admin/drivers/:driverId/:vehicleId
  delete: (driverId: string, vehicleId: string) =>
    apiClient.delete(`${VEHICLES_BASE_URL}/admin/drivers/${driverId}/${vehicleId}`),

  // POST /vehicles/admin/drivers/:driverId/:vehicleId/activate
  activate: (driverId: string, vehicleId: string) =>
    apiClient.post<DriverVehicle>(`${VEHICLES_BASE_URL}/admin/drivers/${driverId}/${vehicleId}/activate`, {}),
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

export const driverSubscriptionsApi = {
  // GET /subscriptions/admin/drivers/:driverId/history?page=&limit=  (Admin)
  getHistory: (driverId: string, page = 1, limit = 10) =>
    apiClient.get<DriverSubscriptionHistoryRow[]>(
      `${SUBSCRIPTIONS_BASE_URL}/admin/drivers/${driverId}/history?page=${page}&limit=${limit}`,
    ),

  // GET /subscriptions/admin/drivers/:driverId/payments?page=&limit=  (Admin)
  getPayments: (driverId: string, page = 1, limit = 10) =>
    apiClient.get<DriverPaymentRow[]>(
      `${SUBSCRIPTIONS_BASE_URL}/admin/drivers/${driverId}/payments?page=${page}&limit=${limit}`,
    ),
};

export const vehicleModelsLookupApi = {
  // GET /vehicle-models  (Public) — used only for the Create Driver form's dropdown
  list: () => apiClient.get<VehicleModelOption[]>("/vehicle-models"),
};
