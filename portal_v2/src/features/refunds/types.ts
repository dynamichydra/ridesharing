export type RefundStatus = "pending" | "completed" | "failed";

export interface Refund {
  id: string;
  paymentId: string;
  amountMinor: number;
  currencyCode: string;
  reason: string | null;
  status: RefundStatus;
  gatewayRefundId: string | null;
  initiatedByType: string;
  initiatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RefundListParams {
  paymentId?: string;
  status?: RefundStatus | "";
  page?: number;
  limit?: number;
}

export interface CreateRefundPayload {
  paymentId: string;
  amountMinor: number;
  reason?: string;
}

export interface CreateRefundResult {
  refund: Refund;
  fullyRefunded: boolean;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}
