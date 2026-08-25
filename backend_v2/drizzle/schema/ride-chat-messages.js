import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';

export const rideChatMessages = pgTable('ride_chat_messages', {
  id:          uuid('id').primaryKey().defaultRandom(),
  rideId:      uuid('ride_id').references(() => rides.id).notNull(),
  senderId:    uuid('sender_id').notNull(),
  senderRole:  varchar('sender_role', { length: 20 }).notNull(), // rider | driver | system
  messageType: varchar('message_type', { length: 20 }).default('text').notNull(), // text | predefined | quick_reply
  content:     text('content').notNull(),
  readAt:      timestamp('read_at'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
});
