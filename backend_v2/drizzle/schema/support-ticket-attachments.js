import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { supportTicketMessages } from './support-ticket-messages.js';

export const supportTicketAttachments = pgTable('support_ticket_attachments', {
  id:           uuid('id').primaryKey().defaultRandom(),
  messageId:    uuid('message_id').references(() => supportTicketMessages.id, { onDelete: 'cascade' }).notNull(),
  fileUrl:      varchar('file_url', { length: 500 }).notNull(),
  fileType:     varchar('file_type', { length: 50 }).notNull(), // 'image/jpeg', 'image/png', 'audio/aac', 'application/pdf'
  fileSize:     integer('file_size').notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  createdAt:    timestamp('created_at').defaultNow(),
});
