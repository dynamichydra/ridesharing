import { apiClient } from "@/lib/api-client";
import { buildQueryString } from "@/components/filters/buildQueryString";
import type {
  VehicleType,
  VehicleTypeListParams,
  CreateVehicleTypePayload,
  UpdateVehicleTypePayload,
  VehicleTypePricing,
  SetVehicleTypePricingPayload,
  Country,
} from "./types";

const BASE_URL = "/vehicle-types";
const GEO_BASE_URL = "/geo";

export const vehicleTypesApi = {
  list: (params: VehicleTypeListParams = {}) => {
    const { page, limit, ...rest } = params;
    const query = buildQueryString({
      all: "true",
      page: page ?? 1,
      limit: limit ?? 10,
      ...rest,
    });
    return apiClient.get<VehicleType[]>(`${BASE_URL}?${query}`);
  },

  getById: (id: string) => apiClient.get<VehicleType>(`${BASE_URL}/${id}`),

  create: (payload: CreateVehicleTypePayload) =>
    apiClient.post<VehicleType>(BASE_URL, payload),

  update: (id: string, payload: UpdateVehicleTypePayload) =>
    apiClient.patch<VehicleType>(`${BASE_URL}/${id}`, payload),

  remove: (id: string) => apiClient.delete(`${BASE_URL}/${id}`),
};

export const vehicleTypePricingApi = {
  // GET /vehicle-types/pricing?countryId=  (Admin) — every vehicle type's rate card in one country
  listForCountry: (countryId: string) =>
    apiClient.get<VehicleTypePricing[]>(`${BASE_URL}/pricing?countryId=${countryId}`),

  // GET /vehicle-types/:id/pricing?countryId=  (Public) — 404s if no rate card exists
  getForVehicleType: (vehicleTypeId: string, countryId: string) =>
    apiClient.get<VehicleTypePricing>(
      `${BASE_URL}/${vehicleTypeId}/pricing?countryId=${countryId}`
    ),

  // PUT /vehicle-types/:id/pricing  (Admin) — upsert
  set: (vehicleTypeId: string, payload: SetVehicleTypePricingPayload) =>
    apiClient.put<VehicleTypePricing>(`${BASE_URL}/${vehicleTypeId}/pricing`, payload),
};

// GET /geo/admin/countries (Admin, paginated) — confirmed base path only.
// Response envelope/shape below is ASSUMED to follow the same pattern as
// every other admin list endpoint; verify via Network tab.
export const countriesApi = {
  list: () => apiClient.get<Country[]>(`${GEO_BASE_URL}/admin/countries?page=1&limit=100`),
};