import { pgTable, uuid, varchar, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

export const countries = pgTable('countries', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  name:                varchar('name', { length: 100 }).notNull(),
  isoCode:             varchar('iso_code', { length: 2 }).unique().notNull(),   // ISO 3166-1 alpha-2
  dialCode:            varchar('dial_code', { length: 8 }).notNull(),          // "+91"
  currencyCode:        varchar('currency_code', { length: 3 }).notNull(),      // ISO 4217
  defaultLanguageCode: varchar('default_language_code', { length: 8 }),
  isActive:            boolean('is_active').default(true),
  sortOrder:           integer('sort_order').default(0),
  createdAt:           timestamp('created_at').defaultNow(),
  updatedAt:           timestamp('updated_at').defaultNow(),
});
