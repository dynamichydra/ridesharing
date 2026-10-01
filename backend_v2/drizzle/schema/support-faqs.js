import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { supportCategories } from './support-categories.js';

export const supportFaqs = pgTable('support_faqs', {
  id:           uuid('id').primaryKey().defaultRandom(),
  categoryId:   uuid('category_id').references(() => supportCategories.id).notNull(),
  targetRole:   varchar('target_role', { length: 20 }).notNull(), // 'rider' | 'driver' | 'both'
  question:     text('question').notNull(),
  answer:       text('answer').notNull(), // Supports Markdown formatting
  viewCount:    integer('view_count').default(0).notNull(),
  helpfulYes:   integer('helpful_yes').default(0).notNull(),
  helpfulNo:    integer('helpful_no').default(0).notNull(),
  isPublished:  boolean('is_published').default(true).notNull(),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});
