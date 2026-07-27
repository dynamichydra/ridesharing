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

  // PATCH /vehicle-types/:id/enable | /disable  (Admin)
  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<VehicleType>(`${BASE_URL}/${id}/${isActive ? "enable" : "disable"}`, {}),
};
