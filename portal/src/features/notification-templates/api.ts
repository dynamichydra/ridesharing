import { apiClient } from "@/lib/api-client";
import type {
  NotificationTemplate,
  NotificationTemplateListParams,
  NotificationTemplatePayload,
  UpdateNotificationTemplatePayload,
  NotificationEventCatalog,
  PreviewResult,
} from "./types";

const BASE_URL = "/notification-templates";

function buildQuery(params: NotificationTemplateListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.eventType) query.set("eventType", params.eventType);
  if (params.channel) query.set("channel", params.channel);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  return query.toString();
}

export const notificationTemplatesApi = {
  // GET /notification-templates/events  (Admin) — static event registry for the variable-picker
  listEvents: () => apiClient.get<NotificationEventCatalog>(`${BASE_URL}/events`),

  list: (params: NotificationTemplateListParams) =>
    apiClient.get<NotificationTemplate[]>(`${BASE_URL}?${buildQuery(params)}`),

  getById: (id: string) => apiClient.get<NotificationTemplate>(`${BASE_URL}/${id}`),

  create: (payload: NotificationTemplatePayload) => apiClient.post<NotificationTemplate>(BASE_URL, payload),

  update: (id: string, payload: UpdateNotificationTemplatePayload) =>
    apiClient.patch<NotificationTemplate>(`${BASE_URL}/${id}`, payload),

  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<NotificationTemplate>(`${BASE_URL}/${id}/${isActive ? "enable" : "disable"}`, {}),

  preview: (id: string, variables: Record<string, string> = {}) =>
    apiClient.post<PreviewResult>(`${BASE_URL}/${id}/preview`, { variables }),
};
