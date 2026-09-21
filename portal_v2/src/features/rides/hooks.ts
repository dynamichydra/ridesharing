import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ridesApi } from "./api";
import type { RideListParams } from "./types";

const RIDES_KEY = "rides";


export function useRides(params: RideListParams = {}) {
  return useQuery({
    queryKey: [RIDES_KEY, params],
    queryFn: () => ridesApi.list(params),
  });
}

// Pulls up to 5000 rows matching the current filters for CSV export — the API has no
// dedicated export endpoint, so this reuses the list endpoint with a large page size.
export function useExportRides() {
  return useMutation({
    mutationFn: (params: Omit<RideListParams, "page" | "limit">) =>
      ridesApi.list({ ...params, page: 1, limit: 5000 }),
    onError: (err: any) => {
      toast.error(err.message || "Failed to export rides");
    },
  });
}

export function useRideTimeline(rideId?: string) {
  return useQuery({
    queryKey: ["ride-timeline", rideId],
    queryFn: () => ridesApi.getTimelineAdmin(rideId as string),
    enabled: !!rideId,
  });
}

export function useRideOffers(rideId?: string) {
  return useQuery({
    queryKey: ["ride-offers", rideId],
    queryFn: () => ridesApi.getOffersAdmin(rideId as string),
    enabled: !!rideId,
  });
}

export function useCancelRideAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, reason }: { rideId: string; reason?: string }) =>
      ridesApi.cancelAdmin(rideId, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [RIDES_KEY], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["ride-timeline", variables.rideId] });
      toast.success("Ride cancelled");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to cancel ride");
    },
  });
}
