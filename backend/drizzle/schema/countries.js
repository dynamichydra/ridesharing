import { pgTable, uuid, varchar, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

export const countries = pgTable('countries', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  name:                varchar('name', { length: 100 }).notNull(),
  isoCode:             varchar('iso_code', { length: 2 }).unique().notNull(),   // ISO 3166-1 alpha-2
  dialCode:            varchar('dial_code', { length: 8 }).notNull(),          // "+91"
  currencyCode:        varchar('currency_code', { length: 3 }).notNull(),      // ISO 4217
  defaultLanguageCode: varchar('default_language_code', { length: 8 }),
  timezone:            varchar('timezone', { length: 50 }).default('UTC'),     // IANA tz — evaluates fare-rule time windows in local time
  roundingIncrementMinor: integer('rounding_increment_minor').default(1),      // e.g. CAD cash rounds to nearest 5 cents
  isDefault:           boolean('is_default').default(false),                   // fallback country when a pickup point can't be geo-resolved
  isActive:            boolean('is_active').default(true),
  sortOrder:           integer('sort_order').default(0),
  createdAt:           timestamp('created_at').defaultNow(),
  updatedAt:           timestamp('updated_at').defaultNow(),
});
