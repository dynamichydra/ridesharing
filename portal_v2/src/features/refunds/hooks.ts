import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { refundsApi } from "./api";
import type { RefundListParams, CreateRefundPayload } from "./types";

const REFUNDS_KEY = "refunds";

export function useRefunds(params: RefundListParams = {}) {
  return useQuery({
    queryKey: [REFUNDS_KEY, params],
    queryFn: () => refundsApi.list(params),
  });
}

// All refund attempts against a single payment — powers the "Refund" action's history view.
export function useRefundsForPayment(paymentId?: string) {
  return useQuery({
    queryKey: [REFUNDS_KEY, "by-payment", paymentId],
    queryFn: () => refundsApi.list({ paymentId, limit: 50 }),
    enabled: !!paymentId,
  });
}

export function useInitiateRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRefundPayload) => refundsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REFUNDS_KEY], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["ride-payments"], refetchType: "active" });
      toast.success("Refund completed");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to initiate refund");
    },
  });
}
