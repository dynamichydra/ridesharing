import { apiClient } from "@/lib/api-client";
import type { AuditLog, AuditLogListParams } from "./types";

const BASE_URL = "/admin/audit-logs";

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
