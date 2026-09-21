import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { lostItemsApi } from "./api";
import type { LostItemListParams, UpdateLostItemStatusPayload } from "./types";

const QUERY_KEY = "lost-items";

export function useLostItems(params: LostItemListParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => lostItemsApi.listAdmin(params),
  });
}

export function useUpdateLostItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateLostItemStatusPayload;
    }) => lostItemsApi.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Lost item status updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to update status");
    },
  });
}
