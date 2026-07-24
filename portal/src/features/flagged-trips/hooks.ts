import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { flaggedTripsApi } from "./api";
import type { FlaggedTripListParams, ApproveFlaggedTripPayload, AdjustFlaggedTripPayload } from "./types";

const FLAGGED_TRIPS_KEY = "flagged-trips";

export function useFlaggedTrips(params: FlaggedTripListParams = {}) {
  return useQuery({
    queryKey: [FLAGGED_TRIPS_KEY, params],
    queryFn: () => flaggedTripsApi.list(params),
  });
}

export function useApproveFlaggedTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApproveFlaggedTripPayload }) =>
      flaggedTripsApi.approve(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FLAGGED_TRIPS_KEY], refetchType: "active" });
      toast.success("Trip approved — GPS-recomputed fare billed");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to approve trip");
    },
  });
}

export function useAdjustFlaggedTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdjustFlaggedTripPayload }) =>
      flaggedTripsApi.adjust(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FLAGGED_TRIPS_KEY], refetchType: "active" });
      toast.success("Trip adjusted — manual fare billed");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to adjust trip");
    },
  });
}
