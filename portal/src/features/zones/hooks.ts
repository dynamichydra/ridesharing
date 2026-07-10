import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createZone, deleteZone, fetchZones, updateZone } from "./api";
import type { CreateZonePayload, UpdateZonePayload, ZoneListParams } from "./types";

export function useZones(params: ZoneListParams) {
  return useQuery({
    queryKey: ["zones", params],
    queryFn: () => fetchZones(params),
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateZonePayload) => createZone(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      toast.success("Zone geofence created!");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to save zone");
    },
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateZonePayload }) =>
      updateZone(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      toast.success("Zone geofence updated!");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to save zone");
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      toast.success("Zone geofence deleted");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to delete zone");
    },
  });
}