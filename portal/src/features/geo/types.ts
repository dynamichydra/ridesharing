export interface Country {
  id: string;
  name: string;
  isoCode: string;
  dialCode: string;
  currencyCode: string;
  defaultLanguageCode: string | null;
  timezone: string | null;
  roundingIncrementMinor: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface State {
  id: string;
  countryId: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CityType {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  densityLevel: string; // high | medium | low | rural
  defaultSurgeCap: string | number; // e.g. "3.00"
  waitingFeeEnabled: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CityTypeFare {
  id: string;
  cityTypeId: string;
  vehicleTypeId: string;
  vehicleTypeName?: string;
  vehicleTypeSlug?: string;
  vehicleTypeCapacity?: number;
  baseFareMinor: number;
  minFareMinor: number;
  perKmRateMinor?: number;
  costPerKmMinor?: number;
  perMinRateMinor?: number;
  costPerMinMinor?: number;
  waitingPricePerMinMinor?: number;
  waitingCostPerMinMinor?: number;
  waitingGracePeriodMin?: number;
  freeWaitingMinutes?: number;
  bookingFeeMinor?: number;
  serviceFeeMinor?: number;
  cancellationFeeMinor?: number;
  noShowFeeMinor?: number;
  surgeFloorMultiplier?: string | number;
  surgeCapMultiplier?: string | number;
  nonSubscriberCommissionRate?: string | number;
  subscriberCommissionRate?: string | number;
  commissionPercentage?: string | number;
  platformFeeMinor?: number;
  flatCommissionMinor?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  vehicleType?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface City {
  id: string;
  stateId: string;
  countryId: string;
  cityTypeId?: string | null;
  name: string;
  code?: string | null;
  currencyCode?: string | null;
  timezone: string | null;
  boundary?: string | null;
  polygon?: GeoJSONPolygon | null;
  hexCells?: string[] | null;
  resolution?: number | null;
  status?: "ACTIVE" | "INACTIVE" | "RESTRICTED";
  isActive: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  cityType?: CityType | null;
}

// Alias for backwards-compatibility with zone modules
export type CityServiceArea = City;

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface CountryListParams {
  page?: number;
  limit?: number;
}

export interface StateListParams {
  countryId?: string;
  page?: number;
  limit?: number;
}

export interface CityListParams {
  countryId?: string;
  stateId?: string;
  cityTypeId?: string;
  search?: string;
  status?: string;
  isActive?: boolean | string;
  page?: number;
  limit?: number;
}

export interface CityTypeListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CityServiceAreaListParams extends CityListParams {
  cityId?: string;
}

export interface CreateCountryPayload {
  name: string;
  isoCode: string;
  dialCode: string;
  currencyCode: string;
  defaultLanguageCode?: string;
  timezone?: string;
  isDefault?: boolean;
  roundingIncrementMinor?: number;
  sortOrder?: number;
}

export type UpdateCountryPayload = Partial<CreateCountryPayload>;

export interface CreateStatePayload {
  countryId: string;
  name: string;
  code?: string;
}

export type UpdateStatePayload = Partial<CreateStatePayload>;

export interface CreateCityTypePayload {
  code: string;
  name: string;
  description?: string;
  densityLevel?: "high" | "medium" | "low" | "rural";
  defaultSurgeCap?: number;
  waitingFeeEnabled?: boolean;
  sortOrder?: number;
}

export type UpdateCityTypePayload = Partial<CreateCityTypePayload>;

export interface CreateCityPayload {
  stateId: string;
  countryId: string;
  cityTypeId?: string | null;
  name: string;
  code?: string;
  currencyCode?: string;
  timezone?: string;
  boundary?: string;
  polygon?: GeoJSONPolygon;
  resolution?: number;
  status?: "ACTIVE" | "INACTIVE" | "RESTRICTED";
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateCityPayload = Partial<CreateCityPayload>;

export interface UpsertCityTypeFarePayload {
  vehicleTypeId: string;
  baseFareMinor: number;
  perKmRateMinor?: number;
  costPerKmMinor?: number;
  perMinRateMinor?: number;
  costPerMinMinor?: number;
  waitingPricePerMinMinor?: number;
  waitingCostPerMinMinor?: number;
  waitingGracePeriodMin?: number;
  freeWaitingMinutes?: number;
  minFareMinor?: number;
  bookingFeeMinor?: number;
  serviceFeeMinor?: number;
  cancellationFeeMinor?: number;
  noShowFeeMinor?: number;
  nonSubscriberCommissionRate?: number | string;
  commissionPercentage?: number | string;
  platformFeeMinor?: number;
  flatCommissionMinor?: number;
  isActive?: boolean;
}

export interface Currency {
  id: string;
  code: string; // e.g. INR, USD, EUR, CAD
  name: string; // e.g. Indian Rupee
  symbol: string; // e.g. ₹, $, €
  minorUnitExponent: number; // e.g. 2 for paise/cents, 0 for JPY, 3 for BHD
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyListParams {
  search?: string;
  isActive?: boolean | string;
  page?: number;
  limit?: number;
}

export interface CreateCurrencyPayload {
  code: string;
  name: string;
  symbol: string;
  minorUnitExponent?: number;
}

export type UpdateCurrencyPayload = Partial<CreateCurrencyPayload>;
