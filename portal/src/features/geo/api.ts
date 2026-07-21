import { apiClient } from "@/lib/api-client";
import type {
  Country,
  CountryListParams,
  CreateCountryPayload,
  UpdateCountryPayload,
  State,
  StateListParams,
  CreateStatePayload,
  UpdateStatePayload,
  City,
  CityListParams,
  CreateCityPayload,
  UpdateCityPayload,
} from "./types";

const BASE_URL = "/geo";

function buildCountryQuery(params: CountryListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  return query.toString();
}

function buildStateQuery(params: StateListParams) {
  const query = new URLSearchParams();
  if (params.countryId) query.set("countryId", params.countryId);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  return query.toString();
}

function buildCityQuery(params: CityListParams) {
  const query = new URLSearchParams();
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.stateId) query.set("stateId", params.stateId);
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  return query.toString();
}

export const countriesApi = {
  // GET /geo/admin/countries?page=&limit=  (Admin)
  list: (params: CountryListParams) =>
    apiClient.get<Country[]>(`${BASE_URL}/admin/countries?${buildCountryQuery(params)}`),

  // POST /geo/admin/countries  (Admin)
  create: (payload: CreateCountryPayload) =>
    apiClient.post<Country>(`${BASE_URL}/admin/countries`, payload),

  // PATCH /geo/admin/countries/:id  (Admin)
  update: (id: string, payload: UpdateCountryPayload) =>
    apiClient.patch<Country>(`${BASE_URL}/admin/countries/${id}`, payload),

  // PATCH /geo/admin/countries/:id/enable | /disable  (Admin)
  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<Country>(
      `${BASE_URL}/admin/countries/${id}/${isActive ? "enable" : "disable"}`,
      {},
    ),
};

export const statesApi = {
  // GET /geo/admin/states?countryId=&page=&limit=  (Admin)
  list: (params: StateListParams) =>
    apiClient.get<State[]>(`${BASE_URL}/admin/states?${buildStateQuery(params)}`),

  // POST /geo/admin/states  (Admin)
  create: (payload: CreateStatePayload) =>
    apiClient.post<State>(`${BASE_URL}/admin/states`, payload),

  // PATCH /geo/admin/states/:id  (Admin)
  update: (id: string, payload: UpdateStatePayload) =>
    apiClient.patch<State>(`${BASE_URL}/admin/states/${id}`, payload),

  // PATCH /geo/admin/states/:id/enable | /disable  (Admin)
  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<State>(
      `${BASE_URL}/admin/states/${id}/${isActive ? "enable" : "disable"}`,
      {},
    ),
};

// Public, unpaginated, active-only cascading picker — used for filter dropdowns across
// other features (riders/drivers/rides/ride-payments/wallets/rider-plans) rather than the
// paginated admin endpoints above, which are for the Countries/States/Cities management pages.
export const geoLookupApi = {
  // GET /geo/countries  (Public)
  listCountries: () => apiClient.get<Country[]>(`${BASE_URL}/countries`),
  // GET /geo/countries/:countryId/states  (Public)
  listStates: (countryId: string) => apiClient.get<State[]>(`${BASE_URL}/countries/${countryId}/states`),
  // GET /geo/states/:stateId/cities  (Public)
  listCities: (stateId: string) => apiClient.get<City[]>(`${BASE_URL}/states/${stateId}/cities`),
};

export const citiesApi = {
  // GET /geo/admin/cities?countryId=&stateId=&search=&page=&limit=  (Admin)
  list: (params: CityListParams) =>
    apiClient.get<City[]>(`${BASE_URL}/admin/cities?${buildCityQuery(params)}`),

  // POST /geo/admin/cities  (Admin)
  create: (payload: CreateCityPayload) =>
    apiClient.post<City>(`${BASE_URL}/admin/cities`, payload),

  // PATCH /geo/admin/cities/:id  (Admin)
  update: (id: string, payload: UpdateCityPayload) =>
    apiClient.patch<City>(`${BASE_URL}/admin/cities/${id}`, payload),

  // PATCH /geo/admin/cities/:id/enable | /disable  (Admin)
  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<City>(
      `${BASE_URL}/admin/cities/${id}/${isActive ? "enable" : "disable"}`,
      {},
    ),
};
