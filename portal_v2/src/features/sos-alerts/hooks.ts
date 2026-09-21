import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { sosAlertsApi } from "./api";
import type { SosAlertListParams, ResolveSosAlertPayload } from "./types";

const QUERY_KEY = "sos-alerts";

export function useSosAlerts(params: SosAlertListParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => sosAlertsApi.list(params),
    refetchInterval: 10000, // Safety triage real-time auto-poll
  });
}

export function useResolveSosAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ResolveSosAlertPayload }) =>
      sosAlertsApi.resolve(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("SOS Alert resolved successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to resolve SOS alert");
    },
  });
}
