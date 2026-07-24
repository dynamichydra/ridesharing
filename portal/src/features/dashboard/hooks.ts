import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "./api";
import type { RideStatRow, SubscriptionStatRow } from "./types";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.getStats().then((res) => res.MESSAGE),
  });
}

export function useRideStats(days: number = 7) {
  return useQuery<RideStatRow[]>({
    queryKey: ["dashboard-ride-stats", days],
    queryFn: () =>
      dashboardApi.getRideStats(days).then((res) => {
        const msg = res.MESSAGE;
        if (Array.isArray(msg)) return msg;
        if (msg && Array.isArray(msg.rows)) return msg.rows;
        return [];
      }),
  });
}

export function useSubscriptionStats() {
  return useQuery<SubscriptionStatRow[]>({
    queryKey: ["dashboard-subscription-stats"],
    queryFn: () =>
      dashboardApi.getSubscriptionStats().then((res) => {
        const msg = res.MESSAGE;
        if (Array.isArray(msg)) return msg;
        if (msg && Array.isArray(msg.rows)) return msg.rows;
        return [];
      }),
  });
}