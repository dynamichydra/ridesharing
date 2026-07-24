import { useQuery } from "@tanstack/react-query";
import { auditLogsApi, rideStatusHistoryApi } from "./api";
import type { AuditLogListParams, RideStatusHistoryListParams } from "./types";

const AUDIT_LOGS_KEY = "audit-logs";
const RIDE_HISTORY_KEY = "ride-status-history";

export function useAuditLogs(params: AuditLogListParams = {}) {
  return useQuery({
    queryKey: [AUDIT_LOGS_KEY, params],
    queryFn: () => auditLogsApi.list(params),
  });
}

export function useRideStatusHistory(params: RideStatusHistoryListParams = {}) {
  return useQuery({
    queryKey: [RIDE_HISTORY_KEY, params],
    queryFn: () => rideStatusHistoryApi.list(params),
  });
}
