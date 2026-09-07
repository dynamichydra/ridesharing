import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { driverGroupsApi } from "./api";
import { lookupsApi } from "../subscriptions/api";
import type {
  DriverGroupListParams,
  CreateDriverGroupPayload,
  UpdateDriverGroupPayload,
  AddGroupMembersPayload,
} from "./types";

const DRIVER_GROUPS_KEY = "driver-groups";

export function useDriverGroups(params: DriverGroupListParams) {
  return useQuery({
    queryKey: [DRIVER_GROUPS_KEY, params],
    queryFn: () => driverGroupsApi.list(params),
  });
}

export function useDriverGroup(id: string) {
  return useQuery({
    queryKey: [DRIVER_GROUPS_KEY, id],
    queryFn: () => driverGroupsApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useGroupMembers(groupId: string, page = 1, limit = 10, search?: string) {
  return useQuery({
    queryKey: [DRIVER_GROUPS_KEY, groupId, "members", page, limit, search],
    queryFn: () => driverGroupsApi.listMembers(groupId, page, limit, search),
    enabled: Boolean(groupId),
  });
}

export function useCreateDriverGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDriverGroupPayload) => driverGroupsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVER_GROUPS_KEY], refetchType: "active" });
      toast.success("Driver group created successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE ?? err?.message ?? "Failed to create driver group");
    },
  });
}

export function useUpdateDriverGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDriverGroupPayload }) =>
      driverGroupsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVER_GROUPS_KEY], refetchType: "active" });
      toast.success("Driver group updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE ?? err?.message ?? "Failed to update driver group");
    },
  });
}

export function useDeleteDriverGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => driverGroupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVER_GROUPS_KEY], refetchType: "active" });
      toast.success("Driver group deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE ?? err?.message ?? "Failed to delete driver group");
    },
  });
}

export function useAddGroupMembers(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddGroupMembersPayload) => driverGroupsApi.addMembers(groupId, payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [DRIVER_GROUPS_KEY, groupId, "members"] });
      queryClient.invalidateQueries({ queryKey: [DRIVER_GROUPS_KEY] });
      toast.success(`Added ${data?.MESSAGE?.addedCount ?? "drivers"} to group!`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE ?? err?.message ?? "Failed to add drivers to group");
    },
  });
}

export function useRemoveGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (driverId: string) => driverGroupsApi.removeMember(groupId, driverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVER_GROUPS_KEY, groupId, "members"] });
      queryClient.invalidateQueries({ queryKey: [DRIVER_GROUPS_KEY] });
      toast.success("Driver removed from group");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE ?? err?.message ?? "Failed to remove driver from group");
    },
  });
}

export function useCountryOptions() {
  return useQuery({
    queryKey: ["lookup-countries"],
    queryFn: () => lookupsApi.listCountries(),
    staleTime: 5 * 60 * 1000,
  });
}
