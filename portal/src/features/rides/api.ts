import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  Pagination,
  RawPagination,
  Ride,
  RideListParams,
  RideListResult,
  RideOffer,
  RideTimelineEvent,
} from "./types";

function normalizePagination(
  raw: RawPagination | undefined,
  fallbackPage: number,
  fallbackLimit: number
): Pagination {
  if (!raw) {
    return { total: 0, page: fallbackPage, limit: fallbackLimit, totalPages: 1 };
  }
  return {
    total: raw.totalItems,
    page: raw.currentPage,
    limit: raw.itemsPerPage,
    totalPages: raw.totalPages,
  };
}

// GET /rides — Admin. Filters: status, driverId, riderId (per API reference).
export async function fetchRides(params: RideListParams): Promise<RideListResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));
  if (params.status) query.set("status", params.status);
  if (params.driverId) query.set("driverId", params.driverId);
  if (params.riderId) query.set("riderId", params.riderId);

  const res = await apiClient.get<Ride[]>(`/rides?${query.toString()}`) as ApiResponse<Ride[]>;

  return {
    data: res.MESSAGE ?? [],
    pagination: normalizePagination(res.PAGINATION, page, limit),
  };
}

// GET /rides/:id/history/admin — Admin. Full status-change timeline for any ride.
export async function fetchRideTimelineAdmin(rideId: string): Promise<RideTimelineEvent[]> {
  const res = await apiClient.get<RideTimelineEvent[]>(
    `/rides/${rideId}/history/admin`
  ) as ApiResponse<RideTimelineEvent[]>;
  return res.MESSAGE ?? [];
}

// GET /rides/:id/offers/admin — Admin. Full broadcast/offer history for any ride.
export async function fetchRideOffersAdmin(rideId: string): Promise<RideOffer[]> {
  const res = await apiClient.get<RideOffer[]>(
    `/rides/${rideId}/offers/admin`
  ) as ApiResponse<RideOffer[]>;
  return res.MESSAGE ?? [];
}