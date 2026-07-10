import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createRider, fetchRiders, updateRider } from "./api";
import type { CreateRiderPayload, RiderListParams, UpdateRiderPayload } from "./types";

export function useRiders(params: RiderListParams) {
  return useQuery({
    queryKey: ["riders", params],
    queryFn: () => fetchRiders(params),
  });
}

export function useCreateRider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRiderPayload) => createRider(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders"] });
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
      updateRider(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders"] });
      toast.success("User updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update user");
    },
  });
}