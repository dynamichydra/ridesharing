import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { moderationApi } from "./api";
import type { ModerationQueueParams, ResolveModerationPayload } from "./types";

const QUERY_KEY = "moderation";

export function useModerationQueue(params: ModerationQueueParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => moderationApi.getQueue(params),
  });
}

export function useResolveModeration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ResolveModerationPayload;
    }) => moderationApi.resolve(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Moderation action applied");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to resolve moderation item");
    },
  });
}
