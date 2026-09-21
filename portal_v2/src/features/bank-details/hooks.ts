import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { bankDetailsApi } from "./api";
import type { BankDetailsOwnerType, BankDetailsPayload } from "./types";

import { payoutAccountsApi } from "../payouts/api";

const BANK_DETAILS_KEY = "bank-details";
const DRIVER_PAYOUT_SETUP_KEY = "driver-payout-setup";

export function useDriverPayoutSetup(driverId: string | undefined) {
  return useQuery({
    queryKey: [DRIVER_PAYOUT_SETUP_KEY, driverId],
    queryFn: () => payoutAccountsApi.getDriverSetup(driverId as string),
    enabled: !!driverId,
  });
}

export function useBankDetails(ownerType: BankDetailsOwnerType, ownerId: string | undefined) {
  return useQuery({
    queryKey: [BANK_DETAILS_KEY, ownerType, ownerId],
    queryFn: () => bankDetailsApi.get(ownerType, ownerId as string),
    enabled: !!ownerId,
  });
}

export function useUpsertBankDetails(ownerType: BankDetailsOwnerType, ownerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BankDetailsPayload) => bankDetailsApi.upsert(ownerType, ownerId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BANK_DETAILS_KEY, ownerType, ownerId], refetchType: "active" });
      toast.success("Bank details saved");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save bank details");
    },
  });
}

export function useSetRiderBankVerified(riderId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isVerified: boolean) => bankDetailsApi.setRiderVerified(riderId as string, isVerified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BANK_DETAILS_KEY, "rider", riderId], refetchType: "active" });
      toast.success("Verification status updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update verification status");
    },
  });
}

export function useValidateDriverBank(driverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => bankDetailsApi.validateDriverBank(driverId as string),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [BANK_DETAILS_KEY, "driver", driverId], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: [DRIVER_PAYOUT_SETUP_KEY, driverId], refetchType: "active" });
      if (data?.MESSAGE?.autoVerified) {
        toast.success(`Razorpay Penny Drop Verified! (Name Match: ${data.MESSAGE.nameMatchScore || "100"}%)`);
      } else {
        toast.success(`Razorpay validation executed. Account status: ${data?.MESSAGE?.accountStatus || "Pending"}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Razorpay validation failed");
    },
  });
}
