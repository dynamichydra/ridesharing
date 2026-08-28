import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { dispatchOpsApi } from "./api";
import type { DispatchPolicy } from "./types";

const QUERY_KEY = "dispatch-ops";

export function useActiveDispatchJobs() {
  return useQuery({
    queryKey: [QUERY_KEY, "active-jobs"],
    queryFn: () => dispatchOpsApi.getActiveJobs(),
    refetchInterval: 5000, // Live telemetry polling
  });
}

export function useSupplyDemandMetrics() {
  return useQuery({
    queryKey: [QUERY_KEY, "supply-demand"],
    queryFn: () => dispatchOpsApi.getSupplyDemand(),
    refetchInterval: 10000,
  });
}

export function useDispatchPolicies() {
  return useQuery({
    queryKey: [QUERY_KEY, "policies"],
    queryFn: () => dispatchOpsApi.getPolicies(),
  });
}

export function useAirportQueueStatus() {
  return useQuery({
    queryKey: [QUERY_KEY, "airport-status"],
    queryFn: () => dispatchOpsApi.getAirportStatus(),
    refetchInterval: 15000,
  });
}

export function useUpdateDispatchPolicies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DispatchPolicy>) =>
      dispatchOpsApi.updatePolicies(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "policies"] });
      toast.success("Dispatch policies updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to update policies");
    },
  });
}

export function useTriggerReconciliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => dispatchOpsApi.reconcile(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Matching queue reconciliation triggered");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to trigger reconciliation");
    },
  });
}
