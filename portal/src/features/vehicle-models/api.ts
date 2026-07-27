import { apiClient } from "@/lib/api-client";
import { buildQueryString } from "@/components/filters/buildQueryString";
import type {
  VehicleModel,
  VehicleModelListParams,
  CreateVehicleModelPayload,
  UpdateVehicleModelPayload,
  VehicleTypeOption,
} from "./types";

const BASE_URL = "/vehicle-models";

export const vehicleModelsApi = {
  list: (params: VehicleModelListParams = {}) => {
    const { page, limit, ...rest } = params;
    const query = buildQueryString({
      all: "true",
      page: page ?? 1,
      limit: limit ?? 10,
      ...rest,
    });
    return apiClient.get<VehicleModel[]>(`${BASE_URL}?${query}`);
  },

  getById: (id: string) => apiClient.get<VehicleModel>(`${BASE_URL}/${id}`),

  create: (payload: CreateVehicleModelPayload) =>
    apiClient.post<VehicleModel>(BASE_URL, payload),

  update: (id: string, payload: UpdateVehicleModelPayload) =>
    apiClient.patch<VehicleModel>(`${BASE_URL}/${id}`, payload),

  // PATCH /vehicle-models/:id/enable | /disable  (Admin)
  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<VehicleModel>(`${BASE_URL}/${id}/${isActive ? "enable" : "disable"}`, {}),
};

export const vehicleTypesLookupApi = {
  // GET /vehicle-types  (Public) — used only for the vehicle-model form/filter dropdown
  list: () => apiClient.get<VehicleTypeOption[]>("/vehicle-types"),
};
