import { apiClient } from "@/lib/api-client";
import type{
  ApiResponse,
  CreateZonePayload,
  Pagination,
  RawPagination,
  UpdateZonePayload,
  Zone,
  ZoneListParams,
  ZoneListResult,
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

// GET /zones — Public. Paginated if ?page= is provided.
export async function fetchZones(params: ZoneListParams): Promise<ZoneListResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));

  const res = (await apiClient.get<Zone[]>(`/zones?${query.toString()}`)) as ApiResponse<Zone[]>;

  return {
    data: res.MESSAGE ?? [],
    pagination: normalizePagination(res.PAGINATION, page, limit),
  };
}

// POST /zones — Admin. Create a zone.
export async function createZone(payload: CreateZonePayload): Promise<Zone> {
  const res = (await apiClient.post("/zones", payload)) as ApiResponse<Zone>;
  return res.MESSAGE;
}

// PATCH /zones/:id — Admin. Update a zone.
export async function updateZone(id: string, payload: UpdateZonePayload): Promise<Zone> {
  const res = (await apiClient.patch(`/zones/${id}`, payload)) as ApiResponse<Zone>;
  return res.MESSAGE;
}

// DELETE /zones/:id — Admin. Delete a zone.
export async function deleteZone(id: string): Promise<void> {
  await apiClient.delete(`/zones/${id}`);
}