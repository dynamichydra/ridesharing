import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  fetchSubscriptionPlans,
  fetchVehicleTypeOptions,
  updateSubscriptionPlan,
} from "./api";
import type {
  CreateSubscriptionPlanPayload,
  SubscriptionPlanListParams,
  UpdateSubscriptionPlanPayload,
} from "./types";

export function useSubscriptionPlans(params: SubscriptionPlanListParams) {
  return useQuery({
    queryKey: ["subscription-plans", params],
    queryFn: () => fetchSubscriptionPlans(params),
  });
}

export function useVehicleTypeOptions() {
  return useQuery({
    queryKey: ["vehicle-types"],
    queryFn: fetchVehicleTypeOptions,
  });
}

export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSubscriptionPlanPayload) => createSubscriptionPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Subscription plan created!");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to create plan");
    },
  });
}

export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSubscriptionPlanPayload }) =>
      updateSubscriptionPlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Subscription plan updated!");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to update plan");
    },
  });
}

export function useDeleteSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubscriptionPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Subscription plan removed!");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to delete plan");
    },
  });
}