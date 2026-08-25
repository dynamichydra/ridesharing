import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const legalDocuments = pgTable('legal_documents', {
  id:            uuid('id').primaryKey().defaultRandom(),
  type:          varchar('type', { length: 20 }).notNull(),   // 'terms' | 'privacy_policy'
  version:       varchar('version', { length: 20 }).notNull(),
  countryId:     uuid('country_id').references(() => countries.id), // null = global default
  contentUrl:    text('content_url').notNull(),
  effectiveFrom: timestamp('effective_from').notNull(),
  isActive:      boolean('is_active').default(true),
  createdAt:     timestamp('created_at').defaultNow(),
});
