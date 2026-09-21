export type ModerationStatus = "PENDING" | "APPROVED" | "REDACTED" | "BANNED";
export type ModerationAction = "approve" | "redact" | "ban";

export interface ModerationItem {
  id: string;
  contentType: "REVIEW" | "MESSAGE" | "PROFILE_PHOTO" | "USER_NAME";
  contentId: string;
  authorId: string;
  authorType: "RIDER" | "DRIVER";
  flagReason?: string | null;
  flaggedText?: string | null;
  status: ModerationStatus;
  reviewedById?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationQueueParams {
  status?: string;
  contentType?: string;
  authorType?: string;
  page?: number;
  limit?: number;
}

export interface ResolveModerationPayload {
  action: ModerationAction;
  resolutionNotes?: string;
}

export interface FlagContentPayload {
  contentType: string;
  contentId: string;
  authorId: string;
  authorType: "RIDER" | "DRIVER";
  flagReason: string;
  flaggedText?: string;
}
