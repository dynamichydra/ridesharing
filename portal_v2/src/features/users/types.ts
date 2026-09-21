export interface Rider {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  avatar: string | null;
  isVerified: boolean;
  isBlocked: boolean;
  rating: string;
  totalRides: string;
  countryId: string | null;
  stateId: string | null;
  cityId: string | null;
  createdAt: string;
}

export interface RiderListParams {
  search?: string;
  isVerified?: boolean;
  isBlocked?: boolean;
  countryId?: string;
  stateId?: string;
  cityId?: string;
  page?: number;
  limit?: number;
}


export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface CreateRiderPayload {
  name: string;
  phone: string;
  email?: string;
  isVerified?: boolean;
  countryId?: string;
  stateId?: string;
  cityId?: string;
}

export type UpdateRiderPayload = Partial<
  Pick<Rider, "name" | "email" | "isVerified" | "isBlocked" | "countryId" | "stateId" | "cityId">
>;

// GET /riders/:id (Admin) — a thin aggregate, not a flat Rider. Ride/payment/wallet/
// subscription history stay separate paginated calls (see hooks.ts).
export interface RiderDetail {
  rider: Rider;
  rideStats: {
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
  };
}

export interface RiderRide {
  id: string;
  riderId: string;
  driverId: string | null;
  vehicleTypeId: string;
  status: string;
  pickupAddress: string | null;
  dropAddress: string | null;
  finalFareMinor: number | null;
  estimatedFareMinor: number | null;
  currencyCode: string | null;
  paymentStatus: string;
  requestedAt: string;
  completedAt: string | null;
}

// ── Rider membership plans (parallel to driver subscriptions) ───────────────

export interface RiderPlanSummary {
  id: string;
  name: string;
  type: string;
}

export type RiderSubscriptionStatus = "active" | "expired" | "cancelled" | "trial";

export interface RiderSubscription {
  id: string;
  riderId: string;
  planId: string;
  status: RiderSubscriptionStatus;
  startDate: string;
  endDate: string | null;
  currencyCode: string | null;
  amountMinor: number | null;
  cancelledAt: string | null;
  cancelNote: string | null;
  createdAt: string;
}

export interface RiderSubscriptionHistoryRow {
  subscription: RiderSubscription;
  plan: RiderPlanSummary;
}

export type RiderPaymentStatus = "created" | "captured" | "failed" | "refunded";

export interface RiderPlanPayment {
  id: string;
  riderSubscriptionId: string | null;
  countryId: string;
  gateway: string;
  currencyCode: string;
  amountMinor: number;
  status: RiderPaymentStatus;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  createdAt: string;
}

export interface RiderPlanPaymentRow {
  payment: RiderPlanPayment;
  plan: RiderPlanSummary;
}