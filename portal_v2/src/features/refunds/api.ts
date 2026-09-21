import { apiClient } from "@/lib/api-client";
import type { Refund, RefundListParams, CreateRefundPayload, CreateRefundResult } from "./types";

const BASE_URL = "/refunds";

function buildQuery(params: RefundListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.paymentId) query.set("paymentId", params.paymentId);
  if (params.status) query.set("status", params.status);
  return query.toString();
}

export const refundsApi = {
  // GET /refunds?paymentId=&status=&page=&limit=  (Admin)
  list: (params: RefundListParams = {}) =>
    apiClient.get<Refund[]>(`${BASE_URL}?${buildQuery(params)}`),

  // GET /refunds/:id  (Admin)
  getById: (id: string) => apiClient.get<Refund>(`${BASE_URL}/${id}`),

  // POST /refunds  { paymentId, amountMinor, reason }  (Admin)
  // Requires an Idempotency-Key header so a retried/double-submitted request returns the
  // original result instead of refunding twice — generated fresh per submit attempt.
  create: (payload: CreateRefundPayload) =>
    apiClient.post<CreateRefundResult>(BASE_URL, payload, {
      headers: { "Idempotency-Key": crypto.randomUUID() },
    }),
};
