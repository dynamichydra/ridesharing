export type NotificationChannel = "push" | "sms" | "email";
export type NotificationAudience = "driver" | "rider" | "";

export interface NotificationTemplate {
  id: string;
  eventType: string;
  channel: NotificationChannel;
  audience: "driver" | "rider" | null;
  languageCode: string;
  subject: string | null;
  bodyHtml: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationTemplateListParams {
  page?: number;
  limit?: number;
  eventType?: string;
  channel?: NotificationChannel | "";
  isActive?: boolean;
}

export interface NotificationTemplatePayload {
  eventType: string;
  channel: NotificationChannel;
  audience?: "driver" | "rider";
  languageCode?: string;
  subject?: string;
  bodyHtml: string;
  isActive?: boolean;
}

export type UpdateNotificationTemplatePayload = Partial<NotificationTemplatePayload>;

// GET /notification-templates/events — the static registry driving the variable-picker.
export interface NotificationEventInfo {
  label: string;
  variables: string[];
  channels: NotificationChannel[];
}

export type NotificationEventCatalog = Record<string, NotificationEventInfo>;

export interface PreviewResult {
  subject: string | null;
  bodyHtml: string;
  variables: Record<string, string>;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}
