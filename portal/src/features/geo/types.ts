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
  timezone: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
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
  timezone?: string;
  sortOrder?: number;
}

export type UpdateCityPayload = Partial<CreateCityPayload>;
