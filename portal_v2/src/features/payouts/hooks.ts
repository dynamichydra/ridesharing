import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { payoutAccountsApi, payoutsApi } from "./api";
import type {
  PayoutAccountListParams,
  VerifyPayoutAccountPayload,
  PayoutListParams,
  InstantPayoutPayload,
} from "./types";

const PAYOUT_ACCOUNTS_KEY = "payout-accounts";
const PAYOUTS_KEY = "payouts";
const PAYOUT_BATCHES_KEY = "payout-batches";

export function usePayoutAccounts(params: PayoutAccountListParams = {}) {
  return useQuery({
    queryKey: [PAYOUT_ACCOUNTS_KEY, params],
    queryFn: () => payoutAccountsApi.list(params),
  });
}

export function useVerifyPayoutAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VerifyPayoutAccountPayload }) =>
      payoutAccountsApi.verify(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [PAYOUT_ACCOUNTS_KEY], refetchType: "active" });
      toast.success(variables.payload.approve ? "Payout account approved" : "Payout account rejected");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update payout account");
    },
  });
}

export function usePayouts(params: PayoutListParams = {}) {
  return useQuery({
    queryKey: [PAYOUTS_KEY, params],
    queryFn: () => payoutsApi.list(params),
  });
}

export function usePayoutBatches(page = 1, limit = 10) {
  return useQuery({
    queryKey: [PAYOUT_BATCHES_KEY, page, limit],
    queryFn: () => payoutsApi.listBatches(page, limit),
  });
}

export function useTriggerInstantPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InstantPayoutPayload) => payoutsApi.triggerInstant(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [PAYOUTS_KEY], refetchType: "active" });
      if (result.status === "completed") toast.success("Payout completed");
      else if (result.status === "skipped") toast("Nothing to pay out — no positive wallet balance");
      else toast.error("Payout failed — check the payout list for the failure reason");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to trigger payout");
    },
  });
}

export function useTriggerPayoutBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gateway: string) => payoutsApi.triggerBatch(gateway),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [PAYOUTS_KEY], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: [PAYOUT_BATCHES_KEY], refetchType: "active" });
      if (!result) toast("Gateway not configured or does not support payouts — batch skipped");
      else toast.success(`Batch paid out ${result.driverCount} driver(s)`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to run payout batch");
    },
  });
}
