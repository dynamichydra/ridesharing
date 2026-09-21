import { apiClient } from "@/lib/api-client";
import type {
  Wallet,
  WalletTransaction,
  WalletListItem,
  WalletListParams,
  WalletOwnerType,
  AdjustWalletPayload,
  AdjustWalletResult,
} from "./types";

const BASE_URL = "/wallets";

function buildQuery(params: WalletListParams) {
  const query = new URLSearchParams();
  if (params.ownerType) query.set("ownerType", params.ownerType);
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.stateId) query.set("stateId", params.stateId);
  if (params.cityId) query.set("cityId", params.cityId);
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  return query.toString();
}

export const walletsApi = {
  // GET /wallets?ownerType=&countryId=&stateId=&cityId=&search=&page=&limit=  (Admin)
  list: (params: WalletListParams) =>
    apiClient.get<WalletListItem[]>(`${BASE_URL}?${buildQuery(params)}`),

  // GET /wallets/driver/:driverId  (Admin) — auto-creates a zero-balance wallet if none exists
  getForDriver: (driverId: string) => apiClient.get<Wallet>(`${BASE_URL}/driver/${driverId}`),

  // GET /wallets/rider/:riderId  (Admin) — MESSAGE is null if the rider has no wallet yet
  getForRider: (riderId: string) => apiClient.get<Wallet | null>(`${BASE_URL}/rider/${riderId}`),

  // GET /wallets/:walletId/transactions?page=&limit=  (Admin)
  getTransactions: (walletId: string, page = 1, limit = 10) =>
    apiClient.get<WalletTransaction[]>(
      `${BASE_URL}/${walletId}/transactions?page=${page}&limit=${limit}`,
    ),

  // POST /wallets/driver/:driverId/adjust | /wallets/rider/:riderId/adjust  (Admin)
  adjust: (ownerType: WalletOwnerType, ownerId: string, payload: AdjustWalletPayload) =>
    apiClient.post<AdjustWalletResult>(`${BASE_URL}/${ownerType}/${ownerId}/adjust`, payload),
};
