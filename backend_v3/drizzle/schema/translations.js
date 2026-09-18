import { pgTable, uuid, varchar, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { languages } from './languages.js';

// Generic polymorphic translation store for every admin-editable entity
// (onboarding questions/options, document types, legal documents, vehicle types, notification templates).
export const translations = pgTable('translations', {
  id:           uuid('id').primaryKey().defaultRandom(),
  entityType:   varchar('entity_type', { length: 60 }).notNull(),
  entityId:     uuid('entity_id').notNull(),
  fieldName:    varchar('field_name', { length: 60 }).notNull(),   // 'label' | 'description' | 'placeholder'
  languageCode: varchar('language_code', { length: 8 }).references(() => languages.code).notNull(),
  value:        text('value').notNull(),
  updatedAt:    timestamp('updated_at').defaultNow(),
}, (t) => ([
  unique().on(t.entityType, t.entityId, t.fieldName, t.languageCode),
]));
