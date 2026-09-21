export type DisputeGateway = "razorpay" | "stripe";

export interface Dispute {
  id: string;
  paymentId: string | null;
  gateway: DisputeGateway;
  gatewayDisputeId: string;
  amountMinor: number;
  currencyCode: string;
  reason: string | null;
  // Raw gateway status string (e.g. "needs_response", "won", "lost", "under_review") — the
  // gateways don't share one enum, so this isn't narrowed further on the wire.
  status: string;
  evidenceDueBy: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeListParams {
  status?: string;
  gateway?: DisputeGateway | "";
  page?: number;
  limit?: number;
}

export interface UpdateDisputeNotesPayload {
  adminNotes: string;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}
