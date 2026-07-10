import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { vehicleTypesApi } from "./api";
import type {
  VehicleTypeListParams,
  VehicleTypePayload,
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
    mutationFn: (payload: VehicleTypePayload) => vehicleTypesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VEHICLE_TYPES_KEY] });
      toast.success("Vehicle type created!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save vehicle type");
    },
  });
}

export function useUpdateVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateVehicleTypePayload }) =>
      vehicleTypesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VEHICLE_TYPES_KEY] });
      toast.success("Vehicle type updated!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save vehicle type");
    },
  });
}

export function useDeleteVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehicleTypesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VEHICLE_TYPES_KEY] });
      toast.success("Vehicle type deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete vehicle type");
    },
  });
}