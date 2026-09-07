import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { subscriptionPlansApi, lookupsApi, planGroupPricingApi } from "./api";
import type {
  SubscriptionPlanListParams,
  CreateSubscriptionPlanPayload,
  UpdateSubscriptionPlanPayload,
  SetPlanGroupPricingPayload,
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

export function useVehicleTypeOptions() {
  return useQuery({
    queryKey: [SUBSCRIPTION_PLANS_KEY, "lookup-vehicle-types"],
    queryFn: () => lookupsApi.listVehicleTypes(),
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

export function useActiveSubscriptionPlans(countryId?: string) {
  return useQuery({
    queryKey: [SUBSCRIPTION_PLANS_KEY, "active-plans", countryId],
    queryFn: () => subscriptionPlansApi.listActive(countryId),
  });
}

export function useInitiateDriverSubscription() {
  return useMutation({
    mutationFn: ({ driverId, planId }: { driverId: string; planId: string }) =>
      subscriptionPlansApi.initiateDriverSub(driverId, planId),
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to initiate subscription");
    },
  });
}

export function useVerifyDriverSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ driverId, payload }: { driverId: string; payload: { planId: string; orderRef: string; paymentRef: string; signature?: string } }) =>
      subscriptionPlansApi.verifyDriverSub(driverId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["driver-payments"] });
      toast.success("Driver subscription successfully activated!");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to verify subscription payment");
    },
  });
}

export function useDriverGroupOptions() {
  return useQuery({
    queryKey: ["lookup-driver-groups"],
    queryFn: async () => {
      const res = await lookupsApi.listDriverGroups();
      const rows = res?.MESSAGE?.rows ?? res?.MESSAGE ?? [];
      return rows.map((g: any) => ({ id: g.id, name: `${g.name} (${g.code})` }));
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function usePlanGroupPricing(planId: string) {
  return useQuery({
    queryKey: ["plan-group-pricing", planId],
    queryFn: () => planGroupPricingApi.list(planId),
    enabled: Boolean(planId),
  });
}

export function useSetPlanGroupPricing(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetPlanGroupPricingPayload) =>
      planGroupPricingApi.set(planId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-group-pricing", planId] });
      toast.success("Group pricing offer saved!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE ?? err?.message ?? "Failed to save group pricing");
    },
  });
}

export function useDeletePlanGroupPricing(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pricingId: string) => planGroupPricingApi.delete(planId, pricingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-group-pricing", planId] });
      toast.success("Group pricing offer removed");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE ?? err?.message ?? "Failed to remove group pricing");
    },
  });
}

