import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { cashApi } from "./api";
import type { CashListParams, ReportCashPayload } from "./types";

const QUERY_KEY = "cash-management";

export function useCashCollections(params: CashListParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, "collections", params],
    queryFn: () => cashApi.listCollections(params),
  });
}

export function useCashDisputes(params: CashListParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, "disputes", params],
    queryFn: () => cashApi.listDisputes(params),
  });
}

export function useReportCashCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReportCashPayload) => cashApi.reportCollection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Cash collection recorded and ledger updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to record cash collection");
    },
  });
}

export function useVerifyCashCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cashApi.verifyCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Cash collection verified & settled");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to verify collection");
    },
  });
}
