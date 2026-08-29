import { apiClient } from "@/lib/api-client";
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

const BASE_URL = "/admin";

export const dashboardApi = {
  // GET /admin/dashboard — KPI metrics, fleet status breakdown, health indicators
  getOverview: () => apiClient.get<DashboardOverviewResponse>(`${BASE_URL}/dashboard`),

  // GET /admin/dashboard/dispatch-queue — Live unassigned / searching requests
  getDispatchQueue: (limit = 10) =>
    apiClient.get<DispatchQueueItem[]>(`${BASE_URL}/dashboard/dispatch-queue?limit=${limit}`),

  // GET /admin/dashboard/alerts — High-priority alerts + live event log
  getLiveAlerts: () => apiClient.get<LiveMonitoringResponse>(`${BASE_URL}/dashboard/alerts`),

  // GET /admin/dashboard/supply-demand — Zone equilibrium and gap metrics
  getSupplyDemand: () => apiClient.get<SupplyDemandResponse>(`${BASE_URL}/dashboard/supply-demand`),

  // GET /admin/dashboard/earnings?timeframe= — Revenue trend series
  getEarningsTrend: (timeframe = "week") =>
    apiClient.get<EarningsTrendItem[]>(`${BASE_URL}/dashboard/earnings?timeframe=${timeframe}`),

  // GET /admin/dashboard/recent-activity — Latest platform rides table
  getRecentActivity: (limit = 10) =>
    apiClient.get<RecentActivityItem[]>(`${BASE_URL}/dashboard/recent-activity?limit=${limit}`),

  // GET /admin/analytics/supply-demand-heatmap — Live map drivers and active ride coordinates
  getLiveFleetMap: () =>
    apiClient.get<LiveMapHeatmapResponse>(`${BASE_URL}/analytics/supply-demand-heatmap`),

  // Legacy compatibility
  getRideStats: (days: number) =>
    apiClient.get<RideStatRow[]>(`${BASE_URL}/stats/rides?days=${days}`),

  getSubscriptionStats: () =>
    apiClient.get<SubscriptionStatRow[]>(`${BASE_URL}/stats/subscriptions`),
};