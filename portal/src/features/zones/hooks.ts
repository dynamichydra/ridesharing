import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { zonesApi, geoApi } from "./api";
import type {
  ZoneListParams,
  ZonePayload,
  ZoneDetectPayload,
  GenerateHexCellsPayload,
} from "./types";

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

// Unpaginated zones for map context overlays (draw/edit polygon, pick a point) — distinct
// query key from the table's paginated useZones so the two never collide in cache.
export function useAllZones(countryId?: string) {
  return useQuery({
    queryKey: [ZONES_KEY, "all", countryId],
    queryFn: () => zonesApi.listAllActive(countryId),
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

export function useSetZoneActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      zonesApi.setActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [ZONES_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "Zone enabled" : "Zone disabled");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update zone status");
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

export function useResolveHexZones() {
  return useMutation({
    mutationFn: (payload: ZoneDetectPayload) => zonesApi.resolveHex(payload),
    onError: (err: any) => {
      toast.error(err.message || "H3 hex-zone lookup failed");
    },
  });
}

export function useGenerateHexCells() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateHexCellsPayload) => zonesApi.generateHexCells(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ZONES_KEY], refetchType: "active" });
      toast.success("Hex cells generated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate hex cells");
    },
  });
}
