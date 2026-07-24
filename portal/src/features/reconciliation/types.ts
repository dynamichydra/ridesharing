export type ReconciliationGateway = "razorpay" | "stripe";
export type ReconciliationRunStatus = "completed" | "failed";
export type MismatchType = "missing_internal" | "missing_external" | "amount_mismatch" | "duplicate_internal";
export type MismatchStatus = "open" | "resolved" | "ignored";

export interface ReconciliationRun {
  id: string;
  gateway: ReconciliationGateway;
  windowFrom: string;
  windowTo: string;
  totalInternal: number;
  totalExternal: number;
  mismatchCount: number;
  status: ReconciliationRunStatus;
  createdAt: string;
}

export interface ReconciliationRunListParams {
  gateway?: ReconciliationGateway | "";
  page?: number;
  limit?: number;
}

export interface Mismatch {
  id: string;
  runId: string;
  type: MismatchType;
  gatewayPaymentId: string | null;
  internalAmountMinor: number | null;
  externalAmountMinor: number | null;
  paymentId: string | null;
  status: MismatchStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MismatchListParams {
  runId?: string;
  status?: MismatchStatus | "";
  page?: number;
  limit?: number;
}

export interface ResolveMismatchPayload {
  status: "resolved" | "ignored";
  notes?: string;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}
