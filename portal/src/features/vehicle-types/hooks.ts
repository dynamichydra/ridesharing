import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { vehicleTypesApi } from "./api";
import type {
  VehicleTypeListParams,
  CreateVehicleTypePayload,
  UpdateVehicleTypePayload,
} from "./types";

const VEHICLE_TYPES_KEY = "vehicle-types";

export function useVehicleTypes(params: VehicleTypeListParams = {}) {
  return useQuery({
    queryKey: [VEHICLE_TYPES_KEY, params],
    queryFn: () => vehicleTypesApi.list(params),
  });
}

export function useVehicleType(id: string | undefined) {
  return useQuery({
    queryKey: [VEHICLE_TYPES_KEY, id],
    queryFn: () => vehicleTypesApi.getById(id as string),
    enabled: !!id,
  });
}

export function useCreateVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVehicleTypePayload) => vehicleTypesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VEHICLE_TYPES_KEY], refetchType: "active" });
      toast.success("Vehicle type created!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save vehicle type"),
  });
}

export function useUpdateVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateVehicleTypePayload }) =>
      vehicleTypesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VEHICLE_TYPES_KEY], refetchType: "active" });
      toast.success("Vehicle type updated!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save vehicle type"),
  });
}

export function useSetVehicleTypeActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      vehicleTypesApi.setActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [VEHICLE_TYPES_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "Vehicle type enabled" : "Vehicle type disabled");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update vehicle type status"),
  });
}
