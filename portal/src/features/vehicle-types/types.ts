export interface VehicleType {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  capacity: number;
  sortOrder: number;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleTypeListParams {
  page?: number;
  limit?: number;
  [key: string]: any;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface CreateVehicleTypePayload {
  name: string;
  capacity: number;
  sortOrder: number;
}

export interface UpdateVehicleTypePayload {
  capacity?: number;
  isActive?: boolean;
}

// Confirmed via DBeaver schema (vehicle_type_pricing table) + Postman collection.
export interface VehicleTypePricing {
  id: string;
  vehicleTypeId: string;
  countryId: string;
  currencyCode: string;
  baseRateMinor: number;
  perKmRateMinor: number;
  perMinRateMinor: number;
  minFareMinor: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// PUT /vehicle-types/:id/pricing body — confirmed via Postman collection.
export interface SetVehicleTypePricingPayload {
  countryId: string;
  currencyCode: string;
  baseRateMinor: number;
  perKmRateMinor: number;
  perMinRateMinor: number;
  minFareMinor: number;
}

// Shape ASSUMED from POST /geo/admin/countries body fields — not confirmed
// via Network tab. Verify field names before relying on this.
export interface Country {
  id: string;
  name: string;
  isoCode: string;
  currencyCode: string;
}