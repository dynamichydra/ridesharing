import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { promosApi } from "./api";
import type {
  PromoListParams,
  CreatePromoPayload,
  UpdatePromoPayload,
} from "./types";

const QUERY_KEY = "promos";

export function usePromos(params: PromoListParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => promosApi.list(params),
  });
}

export function useCreatePromo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePromoPayload) => promosApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Promo code created successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to create promo code");
    },
  });
}

export function useUpdatePromo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePromoPayload }) =>
      promosApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Promo code updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to update promo code");
    },
  });
}

export function useTogglePromoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      promosApi.update(id, { isActive: !isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(
        isActive
          ? "Promo code deactivated"
          : "Promo code activated",
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to toggle status");
    },
  });
}
