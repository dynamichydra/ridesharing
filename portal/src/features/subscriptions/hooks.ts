import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { subscriptionPlansApi, lookupsApi } from "./api";
import type {
  SubscriptionPlanListParams,
  CreateSubscriptionPlanPayload,
  UpdateSubscriptionPlanPayload,
} from "./types";

const SUBSCRIPTION_PLANS_KEY = "subscription-plans";

export function useSubscriptionPlans(params: SubscriptionPlanListParams) {
  return useQuery({
    queryKey: [SUBSCRIPTION_PLANS_KEY, params],
    queryFn: () => subscriptionPlansApi.list(params),
  });
}

export function useCountryOptions() {
  return useQuery({
    queryKey: [SUBSCRIPTION_PLANS_KEY, "lookup-countries"],
    queryFn: () => lookupsApi.listCountries(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSubscriptionPlanPayload) => subscriptionPlansApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_PLANS_KEY], refetchType: "active" });
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
      subscriptionPlansApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_PLANS_KEY], refetchType: "active" });
      toast.success("Subscription plan updated!");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to update plan");
    },
  });
}

export function useSetSubscriptionPlanActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      subscriptionPlansApi.setActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_PLANS_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "Subscription plan enabled" : "Subscription plan disabled");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to update plan status");
    },
  });
}
