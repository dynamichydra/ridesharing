import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ridersApi, riderSubscriptionsApi } from "./api";
import type { RiderListParams, CreateRiderPayload, UpdateRiderPayload } from "./types";

const RIDERS_KEY = "riders";

export function useRiders(params: RiderListParams) {
  return useQuery({
    queryKey: [RIDERS_KEY, params],
    queryFn: () => ridersApi.list(params),
  });
}

// Pulls up to 5000 rows matching the current filters for CSV export — the API has no
// dedicated export endpoint, so this reuses the list endpoint with a large page size.
export function useExportRiders() {
  return useMutation({
    mutationFn: (params: Omit<RiderListParams, "page" | "limit">) =>
      ridersApi.list({ ...params, page: 1, limit: 5000 }),
    onError: (err: any) => {
      toast.error(err.message || "Failed to export riders");
    },
  });
}

// Used by the global search (Cmd+K) palette — a small, on-demand lookup, not the list page's query.
export function useSearchRiders(query: string, enabled: boolean) {
  return useQuery({
    queryKey: [RIDERS_KEY, "search", query],
    queryFn: () => ridersApi.list({ search: query, page: 1, limit: 5 }),
    enabled: enabled && query.length >= 2,
  });
}

export function useCreateRider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRiderPayload) => ridersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RIDERS_KEY], refetchType: "active" });
      toast.success("User created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create user");
    },
  });
}

export function useUpdateRider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRiderPayload }) =>
      ridersApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RIDERS_KEY], refetchType: "active" });
      toast.success("User updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update user");
    },
  });
}

export function useRider(id: string | undefined) {
  return useQuery({
    queryKey: [RIDERS_KEY, id],
    queryFn: () => ridersApi.getById(id as string),
    enabled: !!id,
  });
}

export function useRiderRides(id: string | undefined, page = 1, limit = 5) {
  return useQuery({
    queryKey: [RIDERS_KEY, id, "rides", page, limit],
    queryFn: () => ridersApi.getRides(id as string, page, limit),
    enabled: !!id,
  });
}

export function useRiderSubscriptionHistory(riderId: string | undefined, page = 1, limit = 10) {
  return useQuery({
    queryKey: [RIDERS_KEY, riderId, "subscription-history", page, limit],
    queryFn: () => riderSubscriptionsApi.getHistory(riderId as string, page, limit),
    enabled: !!riderId,
  });
}

export function useRiderSubscriptionPayments(riderId: string | undefined, page = 1, limit = 10) {
  return useQuery({
    queryKey: [RIDERS_KEY, riderId, "subscription-payments", page, limit],
    queryFn: () => riderSubscriptionsApi.getPayments(riderId as string, page, limit),
    enabled: !!riderId,
  });
}