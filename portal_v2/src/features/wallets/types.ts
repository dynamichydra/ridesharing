export type WalletOwnerType = "driver" | "rider";
export type WalletStatus = "active" | "frozen";
export type WalletTransactionType = "credit" | "debit";

export interface Wallet {
  id: string;
  driverId: string | null;
  riderId: string | null;
  balanceMinor: number;
  currencyCode: string;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amountMinor: number;
  balanceAfterMinor: number;
  currencyCode: string;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
}

// GET /wallets (Admin) row shape — a wallet joined with its owner's name/phone.
export interface WalletListItem {
  id: string;
  ownerType: WalletOwnerType;
  ownerId: string;
  ownerName: string | null;
  ownerPhone: string | null;
  balanceMinor: number;
  currencyCode: string;
  status: WalletStatus;
  createdAt: string;
}

export interface WalletListParams {
  ownerType?: WalletOwnerType;
  countryId?: string;
  stateId?: string;
  cityId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdjustWalletPayload {
  type: WalletTransactionType;
  amountMinor: number;
  reason: string;
  description?: string;
}

export interface AdjustWalletResult {
  wallet: Wallet;
  transaction: WalletTransaction;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}
