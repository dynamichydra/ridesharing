import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { walletsApi } from "./api";
import type { WalletListParams, WalletOwnerType, AdjustWalletPayload } from "./types";

const WALLETS_KEY = "wallets";

export function useWallets(params: WalletListParams) {
  return useQuery({
    queryKey: [WALLETS_KEY, params],
    queryFn: () => walletsApi.list(params),
  });
}

export function useDriverWallet(driverId: string | undefined) {
  return useQuery({
    queryKey: [WALLETS_KEY, "driver", driverId],
    queryFn: () => walletsApi.getForDriver(driverId as string),
    enabled: !!driverId,
  });
}

export function useRiderWallet(riderId: string | undefined) {
  return useQuery({
    queryKey: [WALLETS_KEY, "rider", riderId],
    queryFn: () => walletsApi.getForRider(riderId as string),
    enabled: !!riderId,
  });
}

export function useWalletTransactions(walletId: string | undefined, page = 1, limit = 10) {
  return useQuery({
    queryKey: [WALLETS_KEY, walletId, "transactions", page, limit],
    queryFn: () => walletsApi.getTransactions(walletId as string, page, limit),
    enabled: !!walletId,
  });
}

export function useAdjustWallet(ownerType: WalletOwnerType, ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdjustWalletPayload) =>
      walletsApi.adjust(ownerType, ownerId as string, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [WALLETS_KEY], refetchType: "active" });
      toast.success(variables.type === "credit" ? "Wallet credited" : "Wallet debited");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to adjust wallet");
    },
  });
}
