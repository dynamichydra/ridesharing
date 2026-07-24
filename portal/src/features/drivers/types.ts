
export interface Driver {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  profilePhoto: string | null;
  licenseNumber: string | null;
  licenseDoc: string | null;
  aadharNumber: string | null;
  aadharDoc: string | null;
  vehicleTypeId: string | null;
  vehicleNumber: string | null;
  vehicleModel: string | null;
  vehiclePhoto: string | null;
  vehicleYear: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  approvalNote: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  isOnline: boolean;
  isBlocked: boolean;
  currentLat: string | null;
  currentLng: string | null;
  lastLocationAt: string | null;
  fcmToken: string | null;
  rating: string;
  totalRatings: number;
  totalRides: number;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
  dateOfBirth: string | null;
  gender: string | null;
  referralCode: string | null;
  referredByDriverId: string | null;
  preferredLanguageCode: string | null;
  countryId: string | null;
  stateId: string | null;
  cityId: string | null;
  registrationStatus: string;
  registrationStep: number;
}

export interface DriverListParams {
  page?: number;
  limit?: number;
  approvalStatus?: string;
  subscriptionStatus?: string;
  registrationStatus?: string;
  countryId?: string;
  stateId?: string;
  cityId?: string;
  isBlocked?: boolean;
  search?: string;
}


export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

// POST /drivers  (Admin) — only name is strictly required; phone or email must be present
// (at least one). Creates the driver in registration_in_progress — this doesn't skip the
// normal document/vehicle registration flow, just seeds the initial record.
export interface CreateDriverPayload {
  name: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  preferredLanguageCode?: string;
  countryId?: string;
  stateId?: string;
  cityId?: string;
  vehicleTypeId?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  vehicleYear?: string;
}

export interface ApproveDriverPayload {
  note?: string;
}

export interface RejectDriverPayload {
  note: string;
}

export interface RequestDocumentsPayload {
  documentTypeCodes: string[];
  note?: string;
}

export interface DriverVehicle {
  id: string;
  driverId: string;
  vehicleTypeId: string;
  brand: string | null;
  model: string;
  year: string;
  color: string | null;
  registrationNumber: string;
  vin: string | null;
  seats: number;
  fuelType: string | null;
  transmission: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DriverDocumentStatus = "pending" | "approved" | "rejected" | "expired";

export interface DriverDocument {
  id: string;
  driverId: string;
  documentTypeId: string;
  frontUrl: string | null;
  backUrl: string | null;
  pdfUrl: string | null;
  // Only present from the admin-review endpoint — short-lived signed GET URLs, not the raw S3 keys.
  frontViewUrl?: string | null;
  backViewUrl?: string | null;
  pdfViewUrl?: string | null;
  documentNumber: string | null;
  expiryDate: string | null;
  status: DriverDocumentStatus;
  rejectionReason: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  uploadedAt: string;
}

export interface DocumentType {
  id: string;
  code: string;
  requiresFront: boolean;
  requiresBack: boolean;
  requiresPdf: boolean;
  requiresExpiry: boolean;
  requiresDocNumber: boolean;
  maxFileSizeMb: number;
  isActive: boolean;
  sortOrder: number;
}

// GET /drivers/:id (Admin) — an aggregated registration-summary view, not a flat Driver.
export interface DriverDetail {
  driver: Driver;
  vehicles: DriverVehicle[];
  documents: DriverDocument[];
  answers: unknown[];
  isComplete: boolean;
  missing: string[];
}

export interface VerifyDocumentPayload {
  approve: boolean;
  rejectionReason?: string;
}

export interface SubscriptionPlanSummary {
  id: string;
  name: string;
  type: string;
}

export type SubscriptionStatus = "active" | "expired" | "cancelled" | "trial";

export interface DriverSubscription {
  id: string;
  driverId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  currencyCode: string | null;
  amountMinor: number | null;
  cancelledAt: string | null;
  cancelNote: string | null;
  createdAt: string;
}

export interface DriverSubscriptionHistoryRow {
  subscription: DriverSubscription;
  plan: SubscriptionPlanSummary;
}

export type PaymentStatus = "created" | "captured" | "failed" | "refunded";

export interface Payment {
  id: string;
  subscriptionId: string | null;
  countryId: string;
  gateway: string;
  currencyCode: string;
  amountMinor: number;
  status: PaymentStatus;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  createdAt: string;
}

export interface DriverPaymentRow {
  payment: Payment;
  plan: SubscriptionPlanSummary;
}

// Minimal option shape for the vehicle-type dropdown in the Create Driver form.
export interface VehicleTypeOption {
  id: string;
  name: string;
}
