import { apiClient } from "@/lib/api-client";
import type {
  DispatchPolicy,
  ActiveDispatchJob,
  SupplyDemandMetric,
  AirportQueueStatus,
} from "./types";

const BASE_URL = "/matching";

export const dispatchOpsApi = {
  getActiveJobs: () =>
    apiClient.get<ActiveDispatchJob[]>(`${BASE_URL}/admin/active-jobs`),

  getSupplyDemand: () =>
    apiClient.get<SupplyDemandMetric[]>(`${BASE_URL}/admin/supply-demand`),

  getPolicies: () =>
    apiClient.get<DispatchPolicy[]>(`${BASE_URL}/admin/policies`),

  updatePolicies: (payload: Partial<DispatchPolicy>) =>
    apiClient.put<DispatchPolicy>(`${BASE_URL}/admin/policies`, payload),

  deletePolicy: (id: string) =>
    apiClient.delete(`${BASE_URL}/admin/policies/${id}`),

  getAirportStatus: () =>
    apiClient.get<AirportQueueStatus>(`${BASE_URL}/airport/status`),

  getMatchingDebugger: (rideId: string) =>
    apiClient.get<any>(`${BASE_URL}/admin/debugger/${rideId}`),

  reconcile: () =>
    apiClient.post(`${BASE_URL}/admin/reconcile`, {}),
};
