import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { notificationTemplatesApi } from "./api";
import type {
  NotificationTemplateListParams,
  NotificationTemplatePayload,
  UpdateNotificationTemplatePayload,
} from "./types";

const TEMPLATES_KEY = "notification-templates";

export function useNotificationEvents() {
  return useQuery({
    queryKey: [TEMPLATES_KEY, "events"],
    queryFn: () => notificationTemplatesApi.listEvents(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNotificationTemplates(params: NotificationTemplateListParams = {}) {
  return useQuery({
    queryKey: [TEMPLATES_KEY, params],
    queryFn: () => notificationTemplatesApi.list(params),
  });
}

export function useCreateNotificationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotificationTemplatePayload) => notificationTemplatesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY], refetchType: "active" });
      toast.success("Template created");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create template");
    },
  });
}

export function useUpdateNotificationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateNotificationTemplatePayload }) =>
      notificationTemplatesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY], refetchType: "active" });
      toast.success("Template updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update template");
    },
  });
}

export function useSetNotificationTemplateActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      notificationTemplatesApi.setActive(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY], refetchType: "active" });
      toast.success(variables.isActive ? "Template enabled" : "Template disabled");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update template status");
    },
  });
}

export function usePreviewNotificationTemplate() {
  return useMutation({
    mutationFn: ({ id, variables }: { id: string; variables?: Record<string, string> }) =>
      notificationTemplatesApi.preview(id, variables),
    onError: (err: any) => {
      toast.error(err.message || "Failed to render preview");
    },
  });
}
