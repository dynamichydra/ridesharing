import { apiClient } from "@/lib/api-client";
import type { BankDetails, BankDetailsOwnerType, BankDetailsPayload } from "./types";

const BASE_URL = "/admin";

function ownerSegment(ownerType: BankDetailsOwnerType) {
  return ownerType === "driver" ? "drivers" : "riders";
}

export const bankDetailsApi = {
  // GET /admin/drivers/:id/bank-details | /admin/riders/:id/bank-details  (Admin)
  get: (ownerType: BankDetailsOwnerType, ownerId: string) =>
    apiClient.get<BankDetails | null>(`${BASE_URL}/${ownerSegment(ownerType)}/${ownerId}/bank-details`),

  // PUT /admin/drivers/:id/bank-details | /admin/riders/:id/bank-details  (Admin)
  upsert: (ownerType: BankDetailsOwnerType, ownerId: string, payload: BankDetailsPayload) =>
    apiClient.put<BankDetails>(`${BASE_URL}/${ownerSegment(ownerType)}/${ownerId}/bank-details`, payload),

  // PATCH /admin/riders/:id/bank-details/verify  { isVerified }  (Admin, rider only)
  setRiderVerified: (riderId: string, isVerified: boolean) =>
    apiClient.patch<BankDetails>(`${BASE_URL}/riders/${riderId}/bank-details/verify`, { isVerified }),

  // POST /admin/drivers/:driverId/bank-details/validate (Admin trigger for RazorpayX Penny Drop / VPA check)
  validateDriverBank: (driverId: string) =>
    apiClient.post<any>(`${BASE_URL}/drivers/${driverId}/bank-details/validate`, {}),
};
