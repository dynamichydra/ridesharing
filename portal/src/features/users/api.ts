import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  Rider,
  RiderListParams,
  RiderListResponse,
  CreateRiderPayload,
  UpdateRiderPayload,
} from "./types";


// Raw envelope shape returned by the API (see RideShare-API.md):
// { SUCCESS, MESSAGE: Rider[], COUNT, PAGINATION: { currentPage, itemsPerPage, totalItems, totalPages } }


function buildQuery(params: RiderListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.isVerified !== undefined) query.set("isVerified", String(params.isVerified));
  if (params.isBlocked !== undefined) query.set("isBlocked", String(params.isBlocked));
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  return query.toString();
}

export async function fetchRiders(
  params: RiderListParams
): Promise<RiderListResponse> {
  const query = buildQuery(params);

  const res = (await apiClient.get<Rider[]>(
    `/riders?${query}`
  )) as ApiResponse<Rider[]>;

  const riders = res.MESSAGE ?? [];
  const raw = res.PAGINATION;

  return {
    data: riders,
    pagination: {
      total: raw?.totalItems ?? riders.length,
      page: raw?.currentPage ?? params.page ?? 1,
      limit: raw?.itemsPerPage ?? params.limit ?? 10,
      totalPages: raw?.totalPages ?? 1,
    },
  };
}

export function createRider(payload: CreateRiderPayload) {
  return apiClient.post<Rider>("/riders", payload);
}

export function updateRider(id: string, payload: UpdateRiderPayload) {
  return apiClient.patch<Rider>(`/riders/${id}`, payload);
}