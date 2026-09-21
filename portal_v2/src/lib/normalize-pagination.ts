// src/lib/normalize-pagination.ts
export interface NormalizedPagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

interface PaginationFallback {
  page: number;
  limit: number;
  dataLength: number;
}

/**
 * Reconciles pagination info returned by list endpoints.
 * Confirmed via Network tab: RideShare's list endpoints return
 * { currentPage, itemsPerPage, totalItems, totalPages } under PAGINATION.
 * Falls back safely if a field is ever missing, instead of trusting
 * the shape blindly (some endpoints only paginate if params are passed).
 */
export function normalizePagination(
  raw: Partial<NormalizedPagination> | undefined,
  fallback: PaginationFallback
): NormalizedPagination {
  return {
    currentPage: raw?.currentPage ?? fallback.page,
    itemsPerPage: raw?.itemsPerPage ?? fallback.limit,
    totalItems: raw?.totalItems ?? fallback.dataLength,
    totalPages: raw?.totalPages ?? 1,
  };
}