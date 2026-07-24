import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { disputesApi } from "./api";
import type { DisputeListParams, UpdateDisputeNotesPayload } from "./types";

const DISPUTES_KEY = "disputes";

export function useDisputes(params: DisputeListParams = {}) {
  return useQuery({
    queryKey: [DISPUTES_KEY, params],
    queryFn: () => disputesApi.list(params),
  });
}

export function useUpdateDisputeNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDisputeNotesPayload }) =>
      disputesApi.updateNotes(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DISPUTES_KEY], refetchType: "active" });
      toast.success("Notes saved");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save notes");
    },
  });
}
