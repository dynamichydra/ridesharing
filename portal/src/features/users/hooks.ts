import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ridersApi } from "./api";
import type { RiderListParams, CreateRiderPayload, UpdateRiderPayload } from "./types";

const RIDERS_KEY = "riders";

export function useRiders(params: RiderListParams) {
  return useQuery({
    queryKey: [RIDERS_KEY, params],
    queryFn: () => ridersApi.list(params),
  });
}

export function useCreateRider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRiderPayload) => ridersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RIDERS_KEY], refetchType: "active" });
      toast.success("User created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create user");
    },
  });
}

export function useUpdateRider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRiderPayload }) =>
      ridersApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RIDERS_KEY], refetchType: "active" });
      toast.success("User updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update user");
    },
  });
}