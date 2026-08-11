import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { admins } from './admins.js';
import { contentFlagStatusEnum } from './enums.js';

export const contentFlagQueue = pgTable('content_flag_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentType: varchar('content_type', { length: 30 }).notNull(), // review | comment | profile_photo
  contentId: varchar('content_id', { length: 64 }).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  authorType: varchar('author_type', { length: 20 }).default('rider').notNull(), // rider | driver
  flagReason: varchar('flag_reason', { length: 50 }).notNull(), // profanity | harassment | pii_leak | manual
  flaggedText: text('flagged_text'),
  status: contentFlagStatusEnum('status').default('pending').notNull(), // pending | approved | redacted | banned

  resolutionNotes: text('resolution_notes'),
  reviewedById: uuid('reviewed_by_id').references(() => admins.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
