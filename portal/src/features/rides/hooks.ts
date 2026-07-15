import { useQuery } from "@tanstack/react-query";
import { ridesApi } from "./api";
import type { RideListParams } from "./types";

const RIDES_KEY = "rides";


export function useRides(params: RideListParams = {}) {
  return useQuery({
    queryKey: [RIDES_KEY, params],
    queryFn: () => ridesApi.list(params),
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
