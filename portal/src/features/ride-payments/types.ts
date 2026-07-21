export type RidePaymentStatus = "created" | "captured" | "failed" | "refunded";
export type RidePaymentMethod = "online" | "cash";
export type RidePaymentGateway = "razorpay" | "stripe" | "cash" | "none";

export interface Payment {
  id: string;
  subscriptionId: string | null;
  rideId: string | null;
  countryId: string;
  gateway: RidePaymentGateway;
  currencyCode: string;
  amountMinor: number;
  status: RidePaymentStatus;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RidePaymentRide {
  id: string;
  riderId: string;
  driverId: string | null;
  pickupAddress: string | null;
  dropAddress: string | null;
  finalFareMinor: number | null;
  currencyCode: string | null;
  paymentMethod: RidePaymentMethod | null;
  paymentStatus: "pending" | "processing" | "paid" | "failed";
  completedAt: string | null;
}

export interface RidePayment {
  payment: Payment;
  ride: RidePaymentRide;
}

export interface RidePaymentListParams {
  page?: number;
  limit?: number;
  status?: RidePaymentStatus | "";
  gateway?: RidePaymentGateway | "";
  paymentMethod?: RidePaymentMethod | "";
  riderId?: string;
  driverId?: string;
  countryId?: string;
  rideId?: string;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface RideInvoice {
  invoiceNumber: string;
  ride: {
    id: string;
    pickupAddress: string | null;
    dropAddress: string | null;
    requestedAt: string;
    completedAt: string | null;
    distanceKm: string | null;
    durationMin: number | null;
  };
  rider: { name: string | null; phone: string } | null;
  driver: { name: string | null; phone: string | null } | null;
  currencyCode: string;
  fareBreakdown: Record<string, unknown>;
  estimatedFareMinor: number | null;
  finalFareMinor: number | null;
  payment: {
    method: RidePaymentMethod | null;
    status: string;
    gateway: RidePaymentGateway | null;
    gatewayPaymentId: string | null;
    paidAt: string | null;
  };
}
