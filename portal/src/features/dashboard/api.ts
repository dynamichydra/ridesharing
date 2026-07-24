import { apiClient } from "@/lib/api-client";
import type { DashboardStats } from "./types";

// Base path: /admin — every route here requires Admin auth
const BASE_URL = "/admin";

export const dashboardApi = {
  // GET /admin/dashboard  (Admin) — high-level driver/rider/ride/subscription counts
  getStats: () => apiClient.get<DashboardStats>(`${BASE_URL}/dashboard`),

  // GET /admin/stats/rides?days=  (Admin) — daily ride stats for the last N days
  getRideStats: (days: number) => apiClient.get<any>(`${BASE_URL}/stats/rides?days=${days}`),

  // GET /admin/stats/subscriptions  (Admin) — per-plan subscription counts
  getSubscriptionStats: () => apiClient.get<any>(`${BASE_URL}/stats/subscriptions`),
};