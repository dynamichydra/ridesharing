import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { driversApi, documentsApi, driverSubscriptionsApi, vehicleModelsLookupApi } from "./api";
import type {
  DriverListParams,
  CreateDriverPayload,
  ApproveDriverPayload,
  RejectDriverPayload,
  RequestDocumentsPayload,
  VerifyDocumentPayload,
} from "./types";

const DRIVERS_KEY = "drivers";
const DOCUMENT_TYPES_KEY = "document-types";

export function useDrivers(params: DriverListParams) {
  return useQuery({
    queryKey: [DRIVERS_KEY, params],
    queryFn: () => driversApi.list(params),
  });
}

// Used by the global search (Cmd+K) palette — a small, on-demand lookup, not the list page's query.
export function useSearchDrivers(query: string, enabled: boolean) {
  return useQuery({
    queryKey: [DRIVERS_KEY, "search", query],
    queryFn: () => driversApi.list({ search: query, page: 1, limit: 5 }),
    enabled: enabled && query.length >= 2,
  });
}

// Pulls up to 5000 rows matching the current filters for CSV export — the API has no
// dedicated export endpoint, so this reuses the list endpoint with a large page size.
export function useExportDrivers() {
  return useMutation({
    mutationFn: (params: Omit<DriverListParams, "page" | "limit">) =>
      driversApi.list({ ...params, page: 1, limit: 5000 }),
    onError: (err: any) => {
      toast.error(err.message || "Failed to export drivers");
    },
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDriverPayload) => driversApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVERS_KEY], refetchType: "active" });
      toast.success("Driver registered");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to register driver");
    },
  });
}

export function useVehicleModelOptions() {
  return useQuery({
    queryKey: ["vehicle-models", "lookup"],
    queryFn: () => vehicleModelsLookupApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDriver(id: string | undefined) {
  return useQuery({
    queryKey: [DRIVERS_KEY, id],
    queryFn: () => driversApi.getById(id as string),
    enabled: !!id,
  });
}

export function useApproveDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string } & ApproveDriverPayload) =>
      driversApi.approve(id, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVERS_KEY], refetchType: "active" });
      toast.success("Driver approved successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to approve driver");
    },
  });
}

export function useRejectDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string } & RejectDriverPayload) =>
      driversApi.reject(id, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVERS_KEY], refetchType: "active" });
      toast.success("Driver application rejected");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reject driver");
    },
  });
}

export function useRequestDriverDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, documentTypeCodes, note }: { id: string } & RequestDocumentsPayload) =>
      driversApi.requestDocuments(id, { documentTypeCodes, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVERS_KEY], refetchType: "active" });
      toast.success("Document request sent to driver");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to request documents");
    },
  });
}

export function useDriverDocuments(driverId: string | undefined) {
  return useQuery({
    queryKey: [DRIVERS_KEY, driverId, "documents"],
    queryFn: () => documentsApi.getForDriver(driverId as string),
    enabled: !!driverId,
  });
}

export function useDocumentTypes() {
  return useQuery({
    queryKey: [DOCUMENT_TYPES_KEY],
    queryFn: () => documentsApi.listTypes(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVerifyDocument(driverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, payload }: { docId: string; payload: VerifyDocumentPayload }) =>
      documentsApi.verify(docId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [DRIVERS_KEY, driverId, "documents"] });
      toast.success(variables.payload.approve ? "Document approved" : "Document rejected");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update document status");
    },
  });
}

export function useDriverSubscriptionHistory(driverId: string | undefined, page = 1, limit = 10) {
  return useQuery({
    queryKey: [DRIVERS_KEY, driverId, "subscription-history", page, limit],
    queryFn: () => driverSubscriptionsApi.getHistory(driverId as string, page, limit),
    enabled: !!driverId,
  });
}

export function useDriverPayments(driverId: string | undefined, page = 1, limit = 10) {
  return useQuery({
    queryKey: [DRIVERS_KEY, driverId, "payments", page, limit],
    queryFn: () => driverSubscriptionsApi.getPayments(driverId as string, page, limit),
    enabled: !!driverId,
  });
}

export function useToggleBlockDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) =>
      isBlocked ? driversApi.unblock(id) : driversApi.block(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [DRIVERS_KEY], refetchType: "active" });
      toast.success(variables.isBlocked ? "Driver unblocked" : "Driver blocked");
    },
    onError: (err: any) => {
      toast.error(err.message || "Operation failed");
    },
  });
}
