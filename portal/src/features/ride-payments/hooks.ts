import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ridePaymentsApi } from "./api";
import { downloadInvoice } from "@/lib/invoice";
import type { RidePaymentListParams } from "./types";

const RIDE_PAYMENTS_KEY = "ride-payments";

export function useRidePayments(params: RidePaymentListParams = {}) {
  return useQuery({
    queryKey: [RIDE_PAYMENTS_KEY, params],
    queryFn: () => ridePaymentsApi.list(params),
  });
}

// All payment attempts for a single ride — powers the per-ride "Payment History" dialog.
export function useRidePaymentHistory(rideId?: string) {
  return useQuery({
    queryKey: [RIDE_PAYMENTS_KEY, "by-ride", rideId],
    queryFn: () => ridePaymentsApi.list({ rideId, limit: 50 }),
    enabled: !!rideId,
  });
}

// Fetches the invoice on demand and immediately triggers the browser download —
// there's nothing to cache, so this is a mutation rather than a query.
export function useDownloadRideInvoice() {
  return useMutation({
    mutationFn: async (rideId: string) => {
      const res = await ridePaymentsApi.getInvoice(rideId);
      downloadInvoice(res.MESSAGE);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to download invoice");
    },
  });
}
