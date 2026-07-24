import { apiClient } from "@/lib/api-client";
import type { LedgerTransaction, LedgerTransactionListParams, LedgerTransactionDetail } from "./types";

const BASE_URL = "/ledger";

function buildQuery(params: LedgerTransactionListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.businessType) query.set("businessType", params.businessType);
  if (params.referenceType) query.set("referenceType", params.referenceType);
  if (params.referenceId) query.set("referenceId", params.referenceId);
  return query.toString();
}

export const ledgerApi = {
  // GET /ledger/transactions?businessType=&referenceType=&referenceId=&page=&limit=  (Admin)
  list: (params: LedgerTransactionListParams = {}) =>
    apiClient.get<LedgerTransaction[]>(`${BASE_URL}/transactions?${buildQuery(params)}`),

  // GET /ledger/transactions/:id  (Admin) — transaction + its balanced entries
  getById: (id: string) => apiClient.get<LedgerTransactionDetail>(`${BASE_URL}/transactions/${id}`),
};
