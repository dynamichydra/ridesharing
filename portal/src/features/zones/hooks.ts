import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { zonesApi } from "./api";
import type { ZoneListParams, ZonePayload, UpdateZonePayload } from "./types";

const ZONES_KEY = "zones";

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
    mutationFn: ({ id, payload }: { id: string; payload: UpdateZonePayload }) =>
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
      toast.success("Zone deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete zone");
    },
  });
}