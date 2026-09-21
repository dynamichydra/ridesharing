import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pricingVersionsApi } from "./api";
import type { PricingVersionListParams } from "./types";
import { toast } from "react-hot-toast";

const QUERY_KEY = ["pricing-versions"];

export function usePricingVersions(params?: PricingVersionListParams) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => pricingVersionsApi.list(params).then((res) => res),
  });
}

export function useCreatePricingVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => pricingVersionsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Pricing version created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.MESSAGE || "Failed to create pricing version");
    },
  });
}

export function useUpdatePricingVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      pricingVersionsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Pricing version updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.MESSAGE || "Failed to update pricing version");
    },
  });
}

export function useTogglePricingVersionActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      pricingVersionsApi.setActive(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(
        `Pricing version ${variables.isActive ? "enabled" : "disabled"} successfully`
      );
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.MESSAGE || "Failed to update status");
    },
  });
}
