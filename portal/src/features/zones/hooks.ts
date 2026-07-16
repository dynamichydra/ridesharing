import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { zonesApi, geoApi } from "./api";
import type { ZoneListParams, ZonePayload, ZoneDetectPayload } from "./types";

const ZONES_KEY = "zones";
const COUNTRIES_KEY = "countries";

export function useZones(params: ZoneListParams) {
  return useQuery({
    queryKey: [ZONES_KEY, params],
    queryFn: () => zonesApi.list(params),
  });
}

export function useZone(id: string | undefined) {
  return useQuery({
    queryKey: [ZONES_KEY, id],
    queryFn: () => zonesApi.getById(id as string),
    enabled: !!id,
  });
}

export function useCountries() {
  return useQuery({
    queryKey: [COUNTRIES_KEY],
    queryFn: () => geoApi.listCountries(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ZonePayload) => zonesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ZONES_KEY], refetchType: "active" });
      toast.success("Zone created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create zone");
    },
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ZonePayload> }) =>
      zonesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ZONES_KEY], refetchType: "active" });
      toast.success("Zone updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update zone");
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => zonesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ZONES_KEY], refetchType: "active" });
      toast.success("Zone deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete zone");
    },
  });
}

export function useDetectZone() {
  return useMutation({
    mutationFn: (payload: ZoneDetectPayload) => zonesApi.detect(payload),
    onError: (err: any) => {
      toast.error(err.message || "Coordinates match lookup failed");
    },
  });
}
