import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { riderPlansApi, lookupsApi } from "./api";
import type {
  RiderPlanListParams,
  CreateRiderPlanPayload,
  UpdateRiderPlanPayload,
} from "./types";

const RIDER_PLANS_KEY = "rider-plans";

export function useRiderPlans(params: RiderPlanListParams) {
  return useQuery({
    queryKey: [RIDER_PLANS_KEY, params],
    queryFn: () => riderPlansApi.list(params),
  });
}

export function useCountryOptions() {
  return useQuery({
    queryKey: [RIDER_PLANS_KEY, "lookup-countries"],
    queryFn: () => lookupsApi.listCountries(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRiderPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRiderPlanPayload) => riderPlansApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RIDER_PLANS_KEY], refetchType: "active" });
      toast.success("Rider plan created!");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to create plan");
    },
  });
}

export function useUpdateRiderPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRiderPlanPayload }) =>
      riderPlansApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RIDER_PLANS_KEY], refetchType: "active" });
      toast.success("Rider plan updated!");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to update plan");
    },
  });
}

export function useSetRiderPlanActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      riderPlansApi.setActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [RIDER_PLANS_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "Rider plan enabled" : "Rider plan disabled");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to update plan status");
    },
  });
}
