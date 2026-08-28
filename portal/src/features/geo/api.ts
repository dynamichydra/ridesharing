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
  CityType,
  CityTypeListParams,
  CreateCityTypePayload,
  UpdateCityTypePayload,
  CityServiceArea,
  CityServiceAreaListParams,
  CityServiceAreaPayload,
  UpdateCityServiceAreaPayload,
  Currency,
  CurrencyListParams,
  CreateCurrencyPayload,
  UpdateCurrencyPayload,
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
  if (params.cityTypeId) query.set("cityTypeId", params.cityTypeId);
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  return query.toString();
}

function buildCityTypeQuery(params: CityTypeListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  return query.toString();
}

function buildServiceAreaQuery(params: CityServiceAreaListParams) {
  const query = new URLSearchParams();
  if (params.cityId) query.set("cityId", params.cityId);
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.status) query.set("status", params.status);
  if (params.isActive !== undefined && params.isActive !== "") {
    query.set("isActive", String(params.isActive));
  }
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

export const cityTypesApi = {
  // GET /geo/admin/city-types?page=&limit=&search= (Admin)
  list: (params: CityTypeListParams) =>
    apiClient.get<CityType[]>(`${BASE_URL}/admin/city-types?${buildCityTypeQuery(params)}`),

  // GET /geo/city-types (Public)
  listPublic: () => apiClient.get<CityType[]>(`${BASE_URL}/city-types`),

  getById: (id: string) => apiClient.get<CityType>(`${BASE_URL}/admin/city-types/${id}`),

  create: (payload: CreateCityTypePayload) =>
    apiClient.post<CityType>(`${BASE_URL}/admin/city-types`, payload),

  update: (id: string, payload: UpdateCityTypePayload) =>
    apiClient.patch<CityType>(`${BASE_URL}/admin/city-types/${id}`, payload),

  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<CityType>(
      `${BASE_URL}/admin/city-types/${id}/${isActive ? "enable" : "disable"}`,
      {},
    ),

  seedDefaults: () => apiClient.post<CityType[]>(`${BASE_URL}/admin/city-types/seed-defaults`, {}),
};

export const citiesApi = {
  // GET /geo/admin/cities?countryId=&stateId=&cityTypeId=&search=&page=&limit=  (Admin)
  list: async (params: CityListParams) => {
    const res = await apiClient.get<Array<{ city?: City; cityType?: any } | City>>(
      `${BASE_URL}/admin/cities?${buildCityQuery(params)}`,
    );
    const unwrapped: City[] = (res.MESSAGE ?? []).map((item: any) => {
      if (item.city) {
        return {
          ...item.city,
          cityType: item.cityType ?? item.city.cityType ?? null,
        };
      }
      return item as City;
    });
    return { ...res, MESSAGE: unwrapped };
  },

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

export const serviceAreasApi = {
  // GET /geo/admin/service-areas?cityId=&status=&page=&limit= (Admin)
  list: async (params: CityServiceAreaListParams) => {
    const res = await apiClient.get<Array<{ serviceArea?: CityServiceArea; city?: any } | CityServiceArea>>(
      `${BASE_URL}/admin/service-areas?${buildServiceAreaQuery(params)}`,
    );
    const unwrapped: CityServiceArea[] = (res.MESSAGE ?? []).map((item: any) => {
      if (item.serviceArea) {
        return {
          ...item.serviceArea,
          city: item.city ?? item.serviceArea.city ?? null,
        };
      }
      return item as CityServiceArea;
    });
    return { ...res, MESSAGE: unwrapped };
  },

  getById: (id: string) => apiClient.get<CityServiceArea>(`${BASE_URL}/admin/service-areas/${id}`),

  create: (payload: CityServiceAreaPayload) =>
    apiClient.post<CityServiceArea>(`${BASE_URL}/admin/service-areas`, payload),

  update: (id: string, payload: UpdateCityServiceAreaPayload) =>
    apiClient.patch<CityServiceArea>(`${BASE_URL}/admin/service-areas/${id}`, payload),

  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<CityServiceArea>(
      `${BASE_URL}/admin/service-areas/${id}/${isActive ? "enable" : "disable"}`,
      {},
    ),

  delete: (id: string) => apiClient.delete<{ success: boolean }>(`${BASE_URL}/admin/service-areas/${id}`),
};

export const currenciesApi = {
  // GET /geo/admin/currencies?search=&page=&limit= (Admin)
  list: (params: CurrencyListParams = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.isActive !== undefined && params.isActive !== "") {
      query.set("isActive", String(params.isActive));
    }
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 20));
    return apiClient.get<Currency[]>(`${BASE_URL}/admin/currencies?${query.toString()}`);
  },

  listPublic: () => apiClient.get<Currency[]>(`${BASE_URL}/currencies`),

  getById: (id: string) => apiClient.get<Currency>(`${BASE_URL}/admin/currencies/${id}`),

  create: (payload: CreateCurrencyPayload) =>
    apiClient.post<Currency>(`${BASE_URL}/admin/currencies`, payload),

  update: (id: string, payload: UpdateCurrencyPayload) =>
    apiClient.patch<Currency>(`${BASE_URL}/admin/currencies/${id}`, payload),

  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<Currency>(
      `${BASE_URL}/admin/currencies/${id}/${isActive ? "enable" : "disable"}`,
      {},
    ),

  seedDefaults: () => apiClient.post<Currency[]>(`${BASE_URL}/admin/currencies/seed-defaults`, {}),
};

// Public, unpaginated, active-only cascading picker
export const geoLookupApi = {
  listCountries: () => apiClient.get<Country[]>(`${BASE_URL}/countries`),
  listStates: (countryId: string) => apiClient.get<State[]>(`${BASE_URL}/countries/${countryId}/states`),
  listCities: async (stateId: string) => {
    const res = await apiClient.get<Array<{ city?: City; cityType?: any } | City>>(`${BASE_URL}/states/${stateId}/cities`);
    const unwrapped: City[] = (res.MESSAGE ?? []).map((item: any) => {
      if (item.city) {
        return {
          ...item.city,
          cityType: item.cityType ?? item.city.cityType ?? null,
        };
      }
      return item as City;
    });
    return { ...res, MESSAGE: unwrapped };
  },
  listCityTypes: () => apiClient.get<CityType[]>(`${BASE_URL}/city-types`),
  listCurrencies: () => apiClient.get<Currency[]>(`${BASE_URL}/currencies`),
};



