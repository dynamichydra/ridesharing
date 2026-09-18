import { pgTable, uuid, varchar, boolean, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const countries = pgTable('countries', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  name:                varchar('name', { length: 100 }).notNull(),
  isoCode:             varchar('iso_code', { length: 2 }).unique().notNull(),
  dialCode:            varchar('dial_code', { length: 10 }),
  currencyCode:        varchar('currency_code', { length: 3 }).notNull(),
  defaultLanguageCode: varchar('default_language_code', { length: 8 }),
  timezone:            varchar('timezone', { length: 100 }).default('UTC'),
  roundingIncrementMinor: integer('rounding_increment_minor').default(1),
  isDefault:           boolean('is_default').default(false),
  isActive:            boolean('is_active').default(true),
  sortOrder:           integer('sort_order').default(0),
  createdAt:           timestamp('created_at').defaultNow(),
  updatedAt:           timestamp('updated_at').defaultNow(),
}, (table) => ({
  isoCodeUnique: uniqueIndex('countries_iso_code_unique').on(table.isoCode),
  activeIndex:   index('countries_active_idx').on(table.isActive),
}));
