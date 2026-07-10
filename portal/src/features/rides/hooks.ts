import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetchRideOffersAdmin, fetchRideTimelineAdmin, fetchRides } from "./api";
import type { RideListParams } from "./types";

// Read-only feature: the Rides API exposes no admin create/update/delete/cancel
// endpoints, so there are no mutation hooks here (no useCreateX/useUpdateX/useDeleteX).

export function useRides(params: RideListParams) {
  return useQuery({
    queryKey: ["rides", params],
    queryFn: async () => {
      try {
        return await fetchRides(params);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to load rides");
        throw err;
      }
    },
  });
}

export function useRideTimeline(rideId?: string) {
  return useQuery({
    queryKey: ["ride-timeline", rideId],
    queryFn: () => fetchRideTimelineAdmin(rideId as string),
    enabled: !!rideId,
  });
}

export function useRideOffers(rideId?: string) {
  return useQuery({
    queryKey: ["ride-offers", rideId],
    queryFn: () => fetchRideOffersAdmin(rideId as string),
    enabled: !!rideId,
  });
}