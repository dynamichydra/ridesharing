import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { reconciliationApi } from "./api";
import type { ReconciliationRunListParams, MismatchListParams, ResolveMismatchPayload } from "./types";

const RUNS_KEY = "reconciliation-runs";
const MISMATCHES_KEY = "reconciliation-mismatches";

export function useReconciliationRuns(params: ReconciliationRunListParams = {}) {
  return useQuery({
    queryKey: [RUNS_KEY, params],
    queryFn: () => reconciliationApi.listRuns(params),
  });
}

export function useMismatches(params: MismatchListParams = {}) {
  return useQuery({
    queryKey: [MISMATCHES_KEY, params],
    queryFn: () => reconciliationApi.listMismatches(params),
  });
}

export function useResolveMismatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ResolveMismatchPayload }) =>
      reconciliationApi.resolveMismatch(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [MISMATCHES_KEY], refetchType: "active" });
      toast.success(variables.payload.status === "resolved" ? "Mismatch resolved" : "Mismatch ignored");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update mismatch");
    },
  });
}
