import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { driversApi } from "./api";
import type {
  DriverListParams,
  ApproveDriverPayload,
  RejectDriverPayload,
} from "./types";

const DRIVERS_KEY = "drivers";

export function useDrivers(params: DriverListParams) {
  return useQuery({
    queryKey: [DRIVERS_KEY, params],
    queryFn: () => driversApi.list(params),
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
      queryClient.invalidateQueries({ queryKey: [DRIVERS_KEY] });
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
      queryClient.invalidateQueries({ queryKey: [DRIVERS_KEY] });
      toast.success("Driver application rejected");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reject driver");
    },
  });
}

export function useToggleBlockDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) =>
      isBlocked ? driversApi.unblock(id) : driversApi.block(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [DRIVERS_KEY] });
      toast.success(variables.isBlocked ? "Driver unblocked" : "Driver blocked");
    },
    onError: (err: any) => {
      toast.error(err.message || "Operation failed");
    },
  });
}