import { pgTable, uuid, varchar, doublePrecision, timestamp, unique } from 'drizzle-orm/pg-core';

export const fxRates = pgTable('fx_rates', {
  id:            uuid('id').primaryKey().defaultRandom(),
  baseCurrency:  varchar('base_currency', { length: 3 }).notNull(),
  quoteCurrency: varchar('quote_currency', { length: 3 }).notNull(),
  rate:          doublePrecision('rate').notNull(),
  provider:      varchar('provider', { length: 50 }).default('system').notNull(),
  effectiveDate: timestamp('effective_date').defaultNow().notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
}, (t) => ([
  unique().on(t.baseCurrency, t.quoteCurrency, t.effectiveDate),
]));
