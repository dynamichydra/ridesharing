import { apiClient } from "@/lib/api-client";
import type { SupportTicket, SupportCategory, SupportFaq, SupportMessage } from "./types";

export interface TicketListParams {
  page?: number;
  limit?: number;
  status?: string;
  userType?: string;
  priority?: string;
  slaBreached?: boolean;
  assignedAdminId?: string;
  query?: string;
}

export interface FaqListParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  query?: string;
  targetRole?: string;
}

export const supportApi = {
  // ── Tickets ─────────────────────────────────────────────────────────────
  getTickets: async (params: TicketListParams = {}) => {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 20));
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.userType) query.set("userType", params.userType);
    if (params.priority) query.set("priority", params.priority);
    if (params.slaBreached !== undefined) query.set("slaBreached", String(params.slaBreached));
    if (params.assignedAdminId) query.set("assignedAdminId", params.assignedAdminId);
    if (params.query) query.set("query", params.query);

    return apiClient.get<SupportTicket[]>(`/support/admin/tickets?${query.toString()}`);
  },

  getTicketById: async (ticketId: string) => {
    const res = await apiClient.get<SupportTicket>(`/support/tickets/${ticketId}`);
    return res.MESSAGE;
  },

  assignTicket: async (ticketId: string, adminId?: string) => {
    return apiClient.post<SupportTicket>(`/support/admin/tickets/${ticketId}/assign`, { adminId });
  },

  updateTicketStatus: async (ticketId: string, status: string) => {
    return apiClient.patch<SupportTicket>(`/support/admin/tickets/${ticketId}/status`, { status });
  },

  addTicketMessage: async (ticketId: string, data: { content: string; messageType?: string; isInternalNote?: boolean; attachments?: any[] }) => {
    return apiClient.post<SupportMessage>(`/support/tickets/${ticketId}/messages`, data);
  },

  // ── Categories ──────────────────────────────────────────────────────────
  getCategories: async (targetRole: string = "both") => {
    const res = await apiClient.get<SupportCategory[]>(`/support/categories?targetRole=${targetRole}`);
    return res.MESSAGE;
  },

  createCategory: async (data: Partial<SupportCategory>) => {
    return apiClient.post<SupportCategory>("/support/admin/categories", data);
  },

  updateCategory: async (id: string, data: Partial<SupportCategory>) => {
    return apiClient.put<SupportCategory>(`/support/admin/categories/${id}`, data);
  },

  // ── FAQs ────────────────────────────────────────────────────────────────
  getFaqs: async (params: FaqListParams = {}) => {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 20));
    if (params.categoryId) query.set("categoryId", params.categoryId);
    if (params.query) query.set("query", params.query);
    if (params.targetRole) query.set("targetRole", params.targetRole);

    return apiClient.get<SupportFaq[]>(`/support/faqs?${query.toString()}`);
  },

  createFaq: async (data: Partial<SupportFaq>) => {
    return apiClient.post<SupportFaq>("/support/admin/faqs", data);
  },

  updateFaq: async (id: string, data: Partial<SupportFaq>) => {
    return apiClient.put<SupportFaq>(`/support/admin/faqs/${id}`, data);
  },

  getPresignedUrl: async (data: { fileType: string; fileSize: number; fileName?: string }) => {
    return apiClient.post<{ uploadUrl: string; fileUrl: string; path: string }>("/support/attachments/presigned-url", data);
  },
};
