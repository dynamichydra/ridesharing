import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const currencies = pgTable('currencies', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  code:               varchar('code', { length: 3 }).notNull().unique(), // e.g. INR, USD, CAD, EUR, JPY
  name:               varchar('name', { length: 60 }).notNull(),
  symbol:             varchar('symbol', { length: 10 }).notNull(),
  minorUnitExponent:  integer('minor_unit_exponent').default(2).notNull(), // 2 for cents/paise, 0 for JPY, 3 for BHD
  isActive:           boolean('is_active').default(true).notNull(),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
});
