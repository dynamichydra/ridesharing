export interface CashCollection {
  id: string;
  rideId: string;
  driverId: string;
  expectedAmountMinor: number;
  collectedAmountMinor: number;
  platformCommissionMinor: number;
  currencyCode: string;
  status: "reported" | "mismatch" | "settled" | "disputed";
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
