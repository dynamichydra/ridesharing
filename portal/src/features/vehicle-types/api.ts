import { apiClient } from "@/lib/api-client";
import { buildQueryString } from "@/components/filters/buildQueryString";
import type {
  VehicleType,
  VehicleTypeListParams,
  CreateVehicleTypePayload,
  UpdateVehicleTypePayload,
} from "./types";

const BASE_URL = "/vehicle-types";

export const vehicleTypesApi = {
  // GET /vehicle-types?all=true&page=&limit=  (Admin view)
  // NOTE: the API doc only confirms all/page/limit for this endpoint. Any
  // extra keys spread in here (name[ILIKE], isActive, from the AutoFilters
  // schema) are NOT confirmed against the backend contract — verify via
  // Network tab that the server actually parses them before relying on it.
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

  // POST /vehicle-types (Admin) { name, capacity, sortOrder } — catalog only, no rates.
  create: (payload: CreateVehicleTypePayload) =>
    apiClient.post<VehicleType>(BASE_URL, payload),

  // PATCH /vehicle-types/:id (Admin) — only capacity/isActive submitted from the Edit form.
  update: (id: string, payload: UpdateVehicleTypePayload) =>
    apiClient.patch<VehicleType>(`${BASE_URL}/${id}`, payload),

  // DELETE /vehicle-types/:id (Admin) — soft-delete (deactivate)
  remove: (id: string) => apiClient.delete(`${BASE_URL}/${id}`),
};
