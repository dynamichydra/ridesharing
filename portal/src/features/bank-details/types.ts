export type BankDetailsOwnerType = "driver" | "rider";

// Masked shape returned by the backend — accountNumberEnc/walletNumberEnc never leave the
// server (see backend bank-account.service.js / rider-bank-account.service.js maskBankAccount).
export interface BankDetails {
  id: string;
  driverId?: string;
  riderId?: string;
  countryId: string;
  bankName: string | null;
  accountHolderName: string | null;
  accountNumberLast4: string | null;
  routingCode: string | null;
  upiId: string | null;
  walletProvider: string | null;
  hasWalletNumber: boolean;
  isVerified: boolean;
  updatedAt: string;
}

// Write-only — the raw account/wallet number is never round-tripped back from the API, so the
// edit form always starts blank rather than pre-filling from a previous GET.
export interface BankDetailsPayload {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  routingCode?: string;
  upiId?: string;
  walletProvider?: string;
  walletNumber?: string;
}
