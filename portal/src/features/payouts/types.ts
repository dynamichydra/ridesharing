export type PayoutAccountStatus = "pending" | "approved" | "rejected";
export type PayoutGateway = "razorpay" | "stripe";
export type PayoutStatus = "pending" | "processing" | "completed" | "failed";
export type PayoutBatchStatus = "processing" | "completed" | "failed";

export interface PayoutAccount {
  id: string;
  driverId: string;
  driverName: string | null;
  driverPhone: string | null;
  gateway: PayoutGateway;
  stripeAccountId: string | null;
  stripeDetailsSubmitted: boolean;
  stripePayoutsEnabled: boolean;
  razorpayFundAccountId: string | null;
  razorpayFundAccountType: "bank_account" | "vpa" | null;
  // Masked bank details / UPI id for admin review of the razorpay path — never the raw
  // account number (see backend driver-bank-accounts.js / bank-account.service.js).
  bankName: string | null;
  accountHolderName: string | null;
  accountNumberLast4: string | null;
  routingCode: string | null;
  upiId: string | null;
  status: PayoutAccountStatus;
  rejectionReason: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutAccountListParams {
  status?: PayoutAccountStatus | "";
  page?: number;
  limit?: number;
}

export interface VerifyPayoutAccountPayload {
  approve: boolean;
  rejectionReason?: string;
}

export interface Payout {
  id: string;
  driverId: string;
  driverName: string | null;
  driverPhone: string | null;
  batchId: string | null;
  payoutAccountId: string;
  amountMinor: number;
  currencyCode: string;
  gateway: PayoutGateway;
  gatewayPayoutId: string | null;
  status: PayoutStatus;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutListParams {
  driverId?: string;
  status?: PayoutStatus | "";
  batchId?: string;
  page?: number;
  limit?: number;
}

export interface InstantPayoutPayload {
  driverId: string;
}

export interface InstantPayoutResult {
  status: "completed" | "failed" | "skipped";
  payoutId?: string;
  amountMinor?: number;
}

export interface PayoutBatch {
  id: string;
  gateway: PayoutGateway;
  status: PayoutBatchStatus;
  totalAmountMinor: number;
  driverCount: number;
  createdAt: string;
}

export interface BatchRunResult {
  batchId: string;
  totalAmountMinor: number;
  driverCount: number;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}
