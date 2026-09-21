import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { vehicleModelsApi, vehicleTypesLookupApi } from "./api";
import type {
  VehicleModelListParams,
  CreateVehicleModelPayload,
  UpdateVehicleModelPayload,
} from "./types";

const VEHICLE_MODELS_KEY = "vehicle-models";

export function useVehicleModels(params: VehicleModelListParams = {}) {
  return useQuery({
    queryKey: [VEHICLE_MODELS_KEY, params],
    queryFn: () => vehicleModelsApi.list(params),
  });
}

export function useVehicleModel(id: string | undefined) {
  return useQuery({
    queryKey: [VEHICLE_MODELS_KEY, id],
    queryFn: () => vehicleModelsApi.getById(id as string),
    enabled: !!id,
  });
}

export function useCreateVehicleModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVehicleModelPayload) => vehicleModelsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VEHICLE_MODELS_KEY], refetchType: "active" });
      toast.success("Vehicle model created!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save vehicle model"),
  });
}

export function useUpdateVehicleModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateVehicleModelPayload }) =>
      vehicleModelsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VEHICLE_MODELS_KEY], refetchType: "active" });
      toast.success("Vehicle model updated!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save vehicle model"),
  });
}

export function useSetVehicleModelActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      vehicleModelsApi.setActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [VEHICLE_MODELS_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "Vehicle model enabled" : "Vehicle model disabled");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update vehicle model status"),
  });
}

export function useVehicleTypeOptions() {
  return useQuery({
    queryKey: ["vehicle-types", "lookup"],
    queryFn: () => vehicleTypesLookupApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}
