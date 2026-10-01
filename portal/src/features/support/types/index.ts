export type TicketStatus = 'open' | 'assigned' | 'pending_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type UserType = 'rider' | 'driver';
export type SenderType = 'rider' | 'driver' | 'agent' | 'bot' | 'system';
export type MessageType = 'text' | 'image' | 'audio' | 'location' | 'action_card' | 'system_event';

export interface SupportAttachment {
  id: string;
  messageId: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderType: SenderType;
  senderId?: string;
  messageType: MessageType;
  content: string;
  metadata?: any;
  isInternalNote: boolean;
  isReadByUser: boolean;
  isReadByAgent: boolean;
  createdAt: string;
  attachments?: SupportAttachment[];
}

export interface SupportCategory {
  id: string;
  parentId?: string;
  targetRole: 'rider' | 'driver' | 'both';
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  displayOrder: number;
  isActive: boolean;
  subcategories?: SupportCategory[];
}

export interface SupportFaq {
  id: string;
  categoryId: string;
  targetRole: 'rider' | 'driver' | 'both';
  question: string;
  answer: string;
  viewCount: number;
  helpfulYes: number;
  helpfulNo: number;
  isPublished: boolean;
  createdAt: string;
}

export interface SupportCsatRating {
  id: string;
  ticketId: string;
  rating: number;
  feedback?: string;
  tags?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userType: UserType;
  userId: string;
  categoryId: string;
  categoryName?: string;
  category?: SupportCategory;
  rideId?: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedAdminId?: string;
  assignedAdminName?: string;
  assignedAdmin?: { id: string; name: string; email: string };
  assignedAt?: string;
  firstRespondedAt?: string;
  slaDueAt: string;
  slaBreached: boolean;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  messages?: SupportMessage[];
  csatRating?: SupportCsatRating;
}
