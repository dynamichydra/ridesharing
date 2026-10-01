import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const supportCategories = pgTable('support_categories', {
  id:           uuid('id').primaryKey().defaultRandom(),
  parentId:     uuid('parent_id'),
  targetRole:   varchar('target_role', { length: 20 }).notNull(), // 'rider' | 'driver' | 'both'
  name:         varchar('name', { length: 100 }).notNull(),
  slug:         varchar('slug', { length: 120 }).notNull().unique(),
  description:  text('description'),
  iconUrl:      text('icon_url'),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive:     boolean('is_active').default(true).notNull(),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});
