import { apiClient } from "@/lib/api-client";
import type {
  DriverGroup,
  DriverGroupMember,
  DriverGroupListParams,
  CreateDriverGroupPayload,
  UpdateDriverGroupPayload,
  AddGroupMembersPayload,
} from "./types";

const BASE_URL = "/driver-groups";

function buildQuery(params: DriverGroupListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.search) query.set("search", params.search);
  return query.toString();
}

export const driverGroupsApi = {
  // GET /driver-groups
  list: (params: DriverGroupListParams) =>
    apiClient.get<DriverGroup[]>(`${BASE_URL}?${buildQuery(params)}`),

  // GET /driver-groups/:id
  getById: (id: string) =>
    apiClient.get<DriverGroup>(`${BASE_URL}/${id}`),

  // POST /driver-groups
  create: (payload: CreateDriverGroupPayload) =>
    apiClient.post<DriverGroup>(BASE_URL, payload),

  // PATCH /driver-groups/:id
  update: (id: string, payload: UpdateDriverGroupPayload) =>
    apiClient.patch<DriverGroup>(`${BASE_URL}/${id}`, payload),

  // DELETE /driver-groups/:id
  delete: (id: string) =>
    apiClient.delete<{ success: boolean; id: string }>(`${BASE_URL}/${id}`),

  // GET /driver-groups/:id/members
  listMembers: (groupId: string, page = 1, limit = 10, search?: string) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) query.set("search", search);
    return apiClient.get<DriverGroupMember[]>(`${BASE_URL}/${groupId}/members?${query.toString()}`);
  },

  // POST /driver-groups/:id/members
  addMembers: (groupId: string, payload: AddGroupMembersPayload) =>
    apiClient.post<{ groupId: string; groupName: string; addedCount: number; skippedCount: number }>(
      `${BASE_URL}/${groupId}/members`,
      payload
    ),

  // DELETE /driver-groups/:id/members/:driverId
  removeMember: (groupId: string, driverId: string) =>
    apiClient.delete<{ success: boolean; groupId: string; driverId: string }>(
      `${BASE_URL}/${groupId}/members/${driverId}`
    ),
};
