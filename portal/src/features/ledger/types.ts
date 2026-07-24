export interface LedgerTransaction {
  id: string;
  businessType: string;
  idempotencyKey: string | null;
  referenceType: string | null;
  referenceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface LedgerTransactionListParams {
  businessType?: string;
  referenceType?: string;
  referenceId?: string;
  page?: number;
  limit?: number;
}

export type LedgerEntryDirection = "debit" | "credit";

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  accountType: "system" | "wallet";
  accountCode: string | null;
  walletId: string | null;
  direction: LedgerEntryDirection;
  amountMinor: number;
  currencyCode: string;
  createdAt: string;
}

export interface LedgerTransactionDetail {
  transaction: LedgerTransaction;
  entries: LedgerEntry[];
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}
