import { apiClient } from "@/lib/api-client";
import type {
  VehicleType,
  VehicleTypeListParams,
  VehicleTypePayload,
  UpdateVehicleTypePayload,
} from "./types";

const BASE_URL = "/vehicle-types";

function buildQuery(params: VehicleTypeListParams) {
  const query = new URLSearchParams();
  // ?all=true — admin view, include inactive types so they can be re-enabled
  query.set("all", "true");
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  return query.toString();
}

export const vehicleTypesApi = {
  // GET /vehicle-types?all=true  (Public — used here for the admin view)
  list: (params: VehicleTypeListParams = {}) =>
    apiClient.get<VehicleType[]>(`${BASE_URL}?${buildQuery(params)}`),

  // GET /vehicle-types/:id  (Public)
  getById: (id: string) => apiClient.get<VehicleType>(`${BASE_URL}/${id}`),

  // POST /vehicle-types  (Admin) { name, baseRate, perKmRate, perMinRate, capacity?, minFare?, sortOrder?, icon? }
  create: (payload: VehicleTypePayload) => apiClient.post<VehicleType>(BASE_URL, payload),

  // PATCH /vehicle-types/:id  (Admin) partial fields
  update: (id: string, payload: UpdateVehicleTypePayload) =>
    apiClient.patch<VehicleType>(`${BASE_URL}/${id}`, payload),

  // DELETE /vehicle-types/:id  (Admin) — soft-delete (deactivate)
  remove: (id: string) => apiClient.delete(`${BASE_URL}/${id}`),
};