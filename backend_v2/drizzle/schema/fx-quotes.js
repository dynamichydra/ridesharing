import { pgTable, uuid, varchar, doublePrecision, timestamp } from 'drizzle-orm/pg-core';

export const fxQuotes = pgTable('fx_quotes', {
  id:            uuid('id').primaryKey().defaultRandom(),
  baseCurrency:  varchar('base_currency', { length: 3 }).notNull(),
  quoteCurrency: varchar('quote_currency', { length: 3 }).notNull(),
  rate:          doublePrecision('rate').notNull(),
  provider:      varchar('provider', { length: 50 }).default('system').notNull(),
  validFrom:     timestamp('valid_from').defaultNow().notNull(),
  validUntil:    timestamp('valid_until').notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
});
