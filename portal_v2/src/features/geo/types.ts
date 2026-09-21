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

export interface City {
  id: string;
  stateId: string;
  countryId: string;
  name: string;
  code?: string | null;
  currencyCode?: string | null;
  timezone: string | null;
  boundary?: string | null;
  polygon?: GeoJSONPolygon | null;
  hexCells?: string[] | null;
  resolution?: number | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

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
  search?: string;
  page?: number;
  limit?: number;
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

export interface CreateCityPayload {
  stateId: string;
  countryId: string;
  name: string;
  code?: string;
  currencyCode?: string;
  timezone?: string;
  boundary?: string;
  polygon?: GeoJSONPolygon;
  resolution?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateCityPayload = Partial<CreateCityPayload>;

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


