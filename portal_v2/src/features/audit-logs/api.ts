import { apiClient } from "@/lib/api-client";
import type { AuditLog, AuditLogListParams, RideStatusHistoryEntry, RideStatusHistoryListParams } from "./types";

const BASE_URL = "/admin/audit-logs";
const RIDE_HISTORY_URL = "/admin/ride-history";

function buildQuery(params: AuditLogListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  if (params.actorType) query.set("actorType", params.actorType);
  if (params.action) query.set("action", params.action);
  return query.toString();
}

export const auditLogsApi = {
  // GET /admin/audit-logs?actorType=&action=&page=&limit=  (Admin)
  list: (params: AuditLogListParams = {}) =>
    apiClient.get<AuditLog[]>(`${BASE_URL}?${buildQuery(params)}`),
};

export const rideStatusHistoryApi = {
  // GET /admin/ride-history?rideId=&page=&limit=  (Admin) — ordered oldest-first (same
  // ordering the per-ride timeline dialog relies on); page 1 with no rideId filter is the
  // oldest rows platform-wide, not the most recent — filter by rideId for a specific ride.
  list: (params: RideStatusHistoryListParams = {}) => {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 20));
    if (params.rideId) query.set("rideId", params.rideId);
    return apiClient.get<RideStatusHistoryEntry[]>(`${RIDE_HISTORY_URL}?${query.toString()}`);
  },
};
