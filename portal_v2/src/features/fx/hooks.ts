import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fxApi } from "./api";
import type { FxRateListParams, CreateFxRatePayload, ConvertMoneyPayload } from "./types";

export const FX_KEYS = {
  all: ["fx-rates"] as const,
  lists: () => [...FX_KEYS.all, "list"] as const,
  list: (params: FxRateListParams) => [...FX_KEYS.lists(), params] as const,
  rate: (base: string, quote: string) => [...FX_KEYS.all, "rate", base, quote] as const,
};

export function useFxRates(params: FxRateListParams = {}) {
  return useQuery({
    queryKey: FX_KEYS.list(params),
    queryFn: () => fxApi.list(params),
    staleTime: 30_000,
  });
}

export function useCreateFxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFxRatePayload) => fxApi.create(payload),
    onSuccess: () => {
      toast.success("Exchange rate updated successfully");
      queryClient.invalidateQueries({ queryKey: FX_KEYS.all });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update exchange rate");
    },
  });
}

export function useDeleteFxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fxApi.delete(id),
    onSuccess: () => {
      toast.success("Exchange rate record deleted");
      queryClient.invalidateQueries({ queryKey: FX_KEYS.all });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete exchange rate");
    },
  });
}

export function useConvertMoney() {
  return useMutation({
    mutationFn: (payload: ConvertMoneyPayload) => fxApi.convert(payload),
    onError: (error: any) => {
      toast.error(error.message || "Conversion failed");
    },
  });
}
