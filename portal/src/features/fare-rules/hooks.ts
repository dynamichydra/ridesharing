import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fareRulesApi, lookupsApi } from "./api";
import type { FareRuleListParams, FareRulePayload, UpdateFareRulePayload } from "./types";

const FARE_RULES_KEY = "fare-rules";

export function useFareRules(params: FareRuleListParams = {}) {
  return useQuery({
    queryKey: [FARE_RULES_KEY, params],
    queryFn: () => fareRulesApi.list(params),
  });
}

export function useFareRule(id: string | undefined) {
  return useQuery({
    queryKey: [FARE_RULES_KEY, id],
    queryFn: () => fareRulesApi.getById(id as string),
    enabled: !!id,
  });
}

export function useCreateFareRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FareRulePayload) => fareRulesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FARE_RULES_KEY], refetchType: "active" });
      toast.success("Fare rule created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create fare rule");
    },
  });
}

export function useUpdateFareRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFareRulePayload }) =>
      fareRulesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FARE_RULES_KEY], refetchType: "active" });
      toast.success("Fare rule updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update fare rule");
    },
  });
}

export function useSetFareRuleActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fareRulesApi.setActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [FARE_RULES_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "Fare rule enabled" : "Fare rule disabled");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update fare rule status");
    },
  });
}

// ---------------------------------------------------------------------
// Dropdown lookups
// ---------------------------------------------------------------------

export function useCountryOptions() {
  return useQuery({
    queryKey: ["fare-rules", "lookup-countries"],
    queryFn: () => lookupsApi.listCountries(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVehicleTypeOptions() {
  return useQuery({
    queryKey: ["fare-rules", "lookup-vehicle-types"],
    queryFn: () => lookupsApi.listVehicleTypes(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useZoneOptions() {
  return useQuery({
    queryKey: ["fare-rules", "lookup-zones"],
    queryFn: () => lookupsApi.listZones(),
    staleTime: 5 * 60 * 1000,
  });
}
