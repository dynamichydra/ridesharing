export interface AuditLog {
  id: string;
  actorId: string | null;
  actorType: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogListParams {
  page?: number;
  limit?: number;
  actorType?: string;
  action?: string;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

// GET /admin/ride-history — global cross-ride status-change log (same rows that power a
// single ride's "Timeline" dialog in the Rides feature, unfiltered by ride here).
export interface RideStatusHistoryEntry {
  id: string;
  rideId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  changedById: string | null;
  reason: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface RideStatusHistoryListParams {
  rideId?: string;
  page?: number;
  limit?: number;
}
