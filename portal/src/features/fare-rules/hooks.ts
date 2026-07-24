import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fareRulesApi, lookupsApi, taxRulesApi, commissionRulesApi } from "./api";
import type {
  FareRuleListParams,
  FareRulePayload,
  UpdateFareRulePayload,
  TaxRuleListParams,
  TaxRulePayload,
  UpdateTaxRulePayload,
  CommissionRuleListParams,
  CommissionRulePayload,
  UpdateCommissionRulePayload,
} from "./types";

const FARE_RULES_KEY = "fare-rules";
const TAX_RULES_KEY = "tax-rules";
const COMMISSION_RULES_KEY = "commission-rules";

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
// Tax Rules
// ---------------------------------------------------------------------

export function useTaxRules(params: TaxRuleListParams = {}) {
  return useQuery({
    queryKey: [TAX_RULES_KEY, params],
    queryFn: () => taxRulesApi.list(params),
  });
}

export function useCreateTaxRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TaxRulePayload) => taxRulesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TAX_RULES_KEY], refetchType: "active" });
      toast.success("Tax rule created");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create tax rule");
    },
  });
}

export function useUpdateTaxRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaxRulePayload }) =>
      taxRulesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TAX_RULES_KEY], refetchType: "active" });
      toast.success("Tax rule updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update tax rule");
    },
  });
}

export function useDisableTaxRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taxRulesApi.disable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TAX_RULES_KEY], refetchType: "active" });
      toast.success("Tax rule disabled");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to disable tax rule");
    },
  });
}

// ---------------------------------------------------------------------
// Commission Rules
// ---------------------------------------------------------------------

export function useCommissionRules(params: CommissionRuleListParams = {}) {
  return useQuery({
    queryKey: [COMMISSION_RULES_KEY, params],
    queryFn: () => commissionRulesApi.list(params),
  });
}

export function useCreateCommissionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommissionRulePayload) => commissionRulesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMISSION_RULES_KEY], refetchType: "active" });
      toast.success("Commission rule created");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create commission rule");
    },
  });
}

export function useUpdateCommissionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCommissionRulePayload }) =>
      commissionRulesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMISSION_RULES_KEY], refetchType: "active" });
      toast.success("Commission rule updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update commission rule");
    },
  });
}

export function useSetCommissionRuleActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      commissionRulesApi.setActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [COMMISSION_RULES_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "Commission rule enabled" : "Commission rule disabled");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update commission rule status");
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
