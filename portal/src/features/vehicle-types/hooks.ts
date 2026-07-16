import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { vehicleTypesApi, vehicleTypePricingApi, countriesApi } from "./api";
import type {
  VehicleTypeListParams,
  CreateVehicleTypePayload,
  UpdateVehicleTypePayload,
  SetVehicleTypePricingPayload,
} from "./types";

const VEHICLE_TYPES_KEY = "vehicle-types";
const PRICING_KEY = "vehicle-type-pricing";
const COUNTRIES_KEY = "geo-admin-countries";

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
    onSuccess: (data) => {
  console.log("SUCCESS", data);
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
    onSuccess: (data) => {
  console.log("SUCCESS", data);
      queryClient.invalidateQueries({ queryKey: [VEHICLE_TYPES_KEY], refetchType: "active" });
      toast.success("Vehicle type updated!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save vehicle type"),
  });
}

export function useDeleteVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehicleTypesApi.remove(id),
    onSuccess: (data) => {
  console.log("SUCCESS", data);
      queryClient.invalidateQueries({ queryKey: [VEHICLE_TYPES_KEY], refetchType: "active" });
      toast.success("Vehicle type deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete vehicle type"),
  });
}

export function useCountries() {
  return useQuery({
    queryKey: [COUNTRIES_KEY],
    queryFn: () => countriesApi.list(),
  });
}

export function useVehicleTypePricingForCountry(countryId: string | undefined) {
  return useQuery({
    queryKey: [PRICING_KEY, countryId],
    queryFn: () => vehicleTypePricingApi.listForCountry(countryId as string),
    enabled: !!countryId,
  });
}

export function useSetVehicleTypePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      vehicleTypeId,
      payload,
    }: {
      vehicleTypeId: string;
      payload: SetVehicleTypePricingPayload;
    }) => vehicleTypePricingApi.set(vehicleTypeId, payload),
    onSuccess: (data) => {
  console.log("SUCCESS", data);
      queryClient.invalidateQueries({ queryKey: [PRICING_KEY], refetchType: "active" });
      toast.success("Pricing updated!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update pricing"),
  });
}