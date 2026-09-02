import { apiClient } from "@/lib/api-client";
import type {
  PayoutAccount,
  PayoutAccountListParams,
  VerifyPayoutAccountPayload,
  Payout,
  PayoutListParams,
  InstantPayoutPayload,
  InstantPayoutResult,
  PayoutBatch,
  BatchRunResult,
} from "./types";

const PAYOUT_ACCOUNTS_BASE = "/payout-accounts";
const PAYOUTS_BASE = "/payouts";

function buildPayoutAccountQuery(params: PayoutAccountListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.status) query.set("status", params.status);
  return query.toString();
}

function buildPayoutQuery(params: PayoutListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.driverId) query.set("driverId", params.driverId);
  if (params.status) query.set("status", params.status);
  if (params.batchId) query.set("batchId", params.batchId);
  return query.toString();
}

export const payoutAccountsApi = {
  // GET /payout-accounts?status=&page=&limit=  (Admin)
  list: (params: PayoutAccountListParams = {}) =>
    apiClient.get<PayoutAccount[]>(`${PAYOUT_ACCOUNTS_BASE}?${buildPayoutAccountQuery(params)}`),

  // PATCH /payout-accounts/:id/verify  { approve, rejectionReason? }  (Admin)
  verify: (id: string, payload: VerifyPayoutAccountPayload) =>
    apiClient.patch<PayoutAccount>(`${PAYOUT_ACCOUNTS_BASE}/${id}/verify`, payload),

  // GET /payout-accounts/drivers/:driverId/setup (Admin)
  getDriverSetup: (driverId: string) =>
    apiClient.get<any>(`${PAYOUT_ACCOUNTS_BASE}/drivers/${driverId}/setup`),

  // POST /payout-accounts/drivers/:driverId/setup (Admin)
  submitDriverSetup: (driverId: string, payload: any) =>
    apiClient.post<any>(`${PAYOUT_ACCOUNTS_BASE}/drivers/${driverId}/setup`, payload),
};

export const payoutsApi = {
  // GET /payouts?driverId=&status=&batchId=&page=&limit=  (Admin)
  list: (params: PayoutListParams = {}) =>
    apiClient.get<Payout[]>(`${PAYOUTS_BASE}?${buildPayoutQuery(params)}`),

  // GET /payouts/batches?page=&limit=  (Admin)
  listBatches: (page = 1, limit = 10) =>
    apiClient.get<PayoutBatch[]>(`${PAYOUTS_BASE}/batches?page=${page}&limit=${limit}`),

  // POST /payouts/instant  { driverId }  (Admin)
  // Requires an Idempotency-Key header so a retried/double-submitted request pays out once,
  // not twice — generated fresh per submit attempt.
  triggerInstant: (payload: InstantPayoutPayload) =>
    apiClient.post<InstantPayoutResult>(`${PAYOUTS_BASE}/instant`, payload, {
      headers: { "Idempotency-Key": crypto.randomUUID() },
    }),

  // POST /payouts/batch/:gateway  (Admin) — manual trigger alongside the scheduled weekly job
  triggerBatch: (gateway: string) =>
    apiClient.post<BatchRunResult | null>(`${PAYOUTS_BASE}/batch/${gateway}`, {}),
};
