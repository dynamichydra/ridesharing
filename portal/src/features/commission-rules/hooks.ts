import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { commissionRulesApi } from "./api";
import type {
  CommissionRuleListParams,
  CreateCommissionRulePayload,
  UpdateCommissionRulePayload,
} from "./types";

const QUERY_KEY = "commission-rules";

export function useCommissionRules(params: CommissionRuleListParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => commissionRulesApi.list(params),
  });
}

export function useCommissionRule(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => commissionRulesApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useCreateCommissionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommissionRulePayload) =>
      commissionRulesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Commission rule created successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to create commission rule");
    },
  });
}

export function useUpdateCommissionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateCommissionRulePayload;
    }) => commissionRulesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Commission rule updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to update commission rule");
    },
  });
}

export function useToggleCommissionRuleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? commissionRulesApi.disable(id) : commissionRulesApi.enable(id),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(
        isActive
          ? "Commission rule disabled successfully"
          : "Commission rule enabled successfully",
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to toggle status");
    },
  });
}

export function useCommissionLookups() {
  const countriesQuery = useQuery({
    queryKey: ["geo-countries-lookup"],
    queryFn: () => commissionRulesApi.listCountries(),
    staleTime: 5 * 60 * 1000,
  });

  const vehicleTypesQuery = useQuery({
    queryKey: ["vehicle-types-lookup"],
    queryFn: () => commissionRulesApi.listVehicleTypes(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    countries: countriesQuery.data?.MESSAGE ?? [],
    vehicleTypes: vehicleTypesQuery.data?.MESSAGE ?? [],
    isLoading: countriesQuery.isLoading || vehicleTypesQuery.isLoading,
  };
}

