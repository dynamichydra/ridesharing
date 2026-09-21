export type FlaggedTripStatus = "pending_review" | "approved" | "adjusted";

export interface FlaggedTrip {
  id: string;
  rideId: string;
  riderId: string;
  driverId: string | null;
  pickupAddress: string | null;
  dropAddress: string | null;
  currencyCode: string | null;
  reason: string;
  estimatedFareMinor: number;
  actualFareMinor: number;
  deviationPct: string;
  status: FlaggedTripStatus;
  adjustedFareMinor: number | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface FlaggedTripListParams {
  status?: FlaggedTripStatus | "";
  page?: number;
  limit?: number;
}

export interface ApproveFlaggedTripPayload {
  note?: string;
}

export interface AdjustFlaggedTripPayload {
  adjustedFareMinor: number;
  note?: string;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}
