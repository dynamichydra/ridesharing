import { apiClient } from "@/lib/api-client";
import type {
  ModerationItem,
  ModerationQueueParams,
  ResolveModerationPayload,
  FlagContentPayload,
} from "./types";

const BASE_URL = "/admin/moderation";

function buildQuery(params: ModerationQueueParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.status) query.set("status", params.status);
  if (params.contentType) query.set("contentType", params.contentType);
  if (params.authorType) query.set("authorType", params.authorType);
  return query.toString();
}

export const moderationApi = {
  getQueue: (params: ModerationQueueParams = {}) =>
    apiClient.get<ModerationItem[]>(`${BASE_URL}/queue?${buildQuery(params)}`),

  resolve: (id: string, payload: ResolveModerationPayload) =>
    apiClient.patch<ModerationItem>(`${BASE_URL}/queue/${id}`, payload),

  flagContent: (payload: FlagContentPayload) =>
    apiClient.post(`${BASE_URL}/flag`, payload),
};
