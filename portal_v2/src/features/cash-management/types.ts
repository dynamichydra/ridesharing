export interface CashCollection {
  id: string;
  rideId: string;
  driverId: string;
  driverName?: string | null;
  driverPhone?: string | null;
  expectedAmountMinor: number;
  collectedAmountMinor: number;
  platformCommissionMinor: number;
  currencyCode: string;
  status: "expected" | "reported" | "verified" | "settled" | "mismatch" | "disputed";
  disputeReason?: string | null;
  reportedAt?: string;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashDispute {
  id: string;
  cashCollectionId: string;
  rideId: string;
  driverId: string;
  riderId: string;
  expectedAmountMinor: number;
  driverReportedMinor: number;
  riderReportedMinor: number;
  currencyCode: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  resolutionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashListParams {
  status?: string;
  driverId?: string;
  currencyCode?: string;
  page?: number;
  limit?: number;
}

export interface ReportCashPayload {
  rideId: string;
  driverId: string;
  expectedAmountMinor: number;
  collectedAmountMinor: number;
  platformCommissionMinor: number;
  currencyCode?: string;
}
