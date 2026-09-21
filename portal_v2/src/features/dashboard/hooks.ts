import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "./api";
import type {
  DashboardOverviewResponse,
  DispatchQueueItem,
  LiveMonitoringResponse,
  SupplyDemandResponse,
  EarningsTrendItem,
  RecentActivityItem,
  LiveMapHeatmapResponse,
  RideStatRow,
  SubscriptionStatRow,
} from "./types";

export { useDashboardSocket } from "./socket";

export function useDashboardOverview() {
  return useQuery<DashboardOverviewResponse>({
    queryKey: ["dashboard-overview"],
    queryFn: () => dashboardApi.getOverview().then((res) => res.MESSAGE),
    staleTime: 60000,
  });
}

export function useDashboardStats() {
  return useDashboardOverview();
}

export function useDispatchQueue(limit = 10) {
  return useQuery<DispatchQueueItem[]>({
    queryKey: ["dashboard-dispatch-queue", limit],
    queryFn: () =>
      dashboardApi.getDispatchQueue(limit).then((res) => {
        const msg = res.MESSAGE;
        if (Array.isArray(msg)) return msg;
        return [];
      }),
    staleTime: 60000,
  });
}

export function useLiveMonitoring() {
  return useQuery<LiveMonitoringResponse>({
    queryKey: ["dashboard-live-monitoring"],
    queryFn: () => dashboardApi.getLiveAlerts().then((res) => res.MESSAGE),
    staleTime: 60000,
  });
}

export function useSupplyDemandAnalytics() {
  return useQuery<SupplyDemandResponse>({
    queryKey: ["dashboard-supply-demand"],
    queryFn: () => dashboardApi.getSupplyDemand().then((res) => res.MESSAGE),
    staleTime: 60000,
  });
}

export function useEarningsTrend(timeframe = "week", currencyCode?: string) {
  return useQuery<EarningsTrendItem[]>({
    queryKey: ["dashboard-earnings-trend", timeframe, currencyCode || "all"],
    queryFn: () =>
      dashboardApi.getEarningsTrend(timeframe, currencyCode).then((res) => {
        const msg = res.MESSAGE;
        if (Array.isArray(msg)) return msg;
        return [];
      }),
    staleTime: 120000,
  });
}

export function useRecentActivity(limit = 10) {
  return useQuery<RecentActivityItem[]>({
    queryKey: ["dashboard-recent-activity", limit],
    queryFn: () =>
      dashboardApi.getRecentActivity(limit).then((res) => {
        const msg = res.MESSAGE;
        if (Array.isArray(msg)) return msg;
        return [];
      }),
    staleTime: 60000,
  });
}

export function useLiveFleetMap() {
  return useQuery<LiveMapHeatmapResponse>({
    queryKey: ["dashboard-live-fleet-map"],
    queryFn: () => dashboardApi.getLiveFleetMap().then((res) => res.MESSAGE),
    staleTime: 60000,
  });
}

export function useRideStats(days: number = 7) {
  return useQuery<RideStatRow[]>({
    queryKey: ["dashboard-ride-stats", days],
    queryFn: () =>
      dashboardApi.getRideStats(days).then((res) => {
        const msg = res.MESSAGE;
        if (Array.isArray(msg)) return msg;
        if (msg && Array.isArray((msg as any).rows)) return (msg as any).rows;
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
        if (msg && Array.isArray((msg as any).rows)) return (msg as any).rows;
        return [];
      }),
  });
}