import { pgTable, uuid, varchar, integer, doublePrecision, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';
import { states } from './states.js';
import { taxRules } from './tax-rules.js';

export const taxCalculations = pgTable('tax_calculations', {
  id: uuid('id').primaryKey().defaultRandom(),
  referenceType: varchar('reference_type', { length: 50 }).notNull(), // ride | subscription | corporate_invoice
  referenceId: uuid('reference_id').notNull(),
  countryId: uuid('country_id').references(() => countries.id),
  stateId: uuid('state_id').references(() => states.id),
  taxRegion: varchar('tax_region', { length: 50 }),
  taxRuleId: uuid('tax_rule_id').references(() => taxRules.id),
  taxRate: doublePrecision('tax_rate').notNull(),
  taxableAmountMinor: integer('taxable_amount_minor').notNull(),
  taxAmountMinor: integer('tax_amount_minor').notNull(),
  taxBreakdown: jsonb('tax_breakdown'), // e.g. { cgst: 50, sgst: 50, igst: 0 }
  currencyCode: varchar('currency_code', { length: 3 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
