import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { supportTickets } from './support-tickets.js';

export const supportTicketMessages = pgTable('support_ticket_messages', {
  id:           uuid('id').primaryKey().defaultRandom(),
  ticketId:     uuid('ticket_id').references(() => supportTickets.id, { onDelete: 'cascade' }).notNull(),
  senderType:   varchar('sender_type', { length: 15 }).notNull(),
                // 'rider' | 'driver' | 'agent' | 'bot' | 'system'
  senderId:     uuid('sender_id'), // Nullable for 'bot' and 'system'

  messageType:  varchar('message_type', { length: 20 }).default('text').notNull(),
                // 'text' | 'image' | 'audio' | 'location' | 'action_card' | 'system_event'
  content:      text('content').notNull(),
  metadata:     jsonb('metadata'), // e.g. location pings, refund action previews, attachment arrays

  isInternalNote: boolean('is_internal_note').default(false).notNull(), // Visible only to support agents
  isReadByUser: boolean('is_read_by_user').default(false).notNull(),
  isReadByAgent: boolean('is_read_by_agent').default(false).notNull(),

  createdAt:    timestamp('created_at').defaultNow(),
});
