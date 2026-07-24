import { apiClient } from "@/lib/api-client";
import type {
  ReconciliationRun,
  ReconciliationRunListParams,
  Mismatch,
  MismatchListParams,
  ResolveMismatchPayload,
} from "./types";

const BASE_URL = "/reconciliation";

function buildRunQuery(params: ReconciliationRunListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.gateway) query.set("gateway", params.gateway);
  return query.toString();
}

function buildMismatchQuery(params: MismatchListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.runId) query.set("runId", params.runId);
  if (params.status) query.set("status", params.status);
  return query.toString();
}

export const reconciliationApi = {
  // GET /reconciliation/runs?gateway=&page=&limit=  (Admin) — runs themselves are produced by
  // the scheduled reconciliation.job.js, not triggered from here.
  listRuns: (params: ReconciliationRunListParams = {}) =>
    apiClient.get<ReconciliationRun[]>(`${BASE_URL}/runs?${buildRunQuery(params)}`),

  // GET /reconciliation/mismatches?runId=&status=&page=&limit=  (Admin)
  listMismatches: (params: MismatchListParams = {}) =>
    apiClient.get<Mismatch[]>(`${BASE_URL}/mismatches?${buildMismatchQuery(params)}`),

  // PATCH /reconciliation/mismatches/:id  { status, notes? }  (Admin)
  resolveMismatch: (id: string, payload: ResolveMismatchPayload) =>
    apiClient.patch<Mismatch>(`${BASE_URL}/mismatches/${id}`, payload),
};
