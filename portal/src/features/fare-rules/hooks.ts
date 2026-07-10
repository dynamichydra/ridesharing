import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fareRulesApi } from "./api";
import type { FareRuleListParams, FareRulePayload, UpdateFareRulePayload } from "./types";

const FARE_RULES_KEY = "fare-rules";

export function useFareRules(params: FareRuleListParams) {
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
      queryClient.invalidateQueries({ queryKey: [FARE_RULES_KEY] });
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
      queryClient.invalidateQueries({ queryKey: [FARE_RULES_KEY] });
      toast.success("Fare rule updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update fare rule");
    },
  });
}

export function useDeleteFareRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fareRulesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FARE_RULES_KEY] });
      toast.success("Fare rule deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete fare rule");
    },
  });
}