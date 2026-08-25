import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const corporateAccounts = pgTable('corporate_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyName: varchar('company_name', { length: 150 }).notNull(),
  billingEmail: varchar('billing_email', { length: 150 }).notNull(),
  billingPhone: varchar('billing_phone', { length: 30 }),
  taxNumber: varchar('tax_number', { length: 50 }),
  address: text('address'),
  countryId: uuid('country_id').references(() => countries.id).notNull(),
  currencyCode: varchar('currency_code', { length: 3 }).notNull(),
  paymentTerms: varchar('payment_terms', { length: 20 }).default('net_30').notNull(), // net_15 | net_30 | prepaid
  creditLimitMinor: integer('credit_limit_minor').default(10000000).notNull(), // e.g. 100,000.00
  currentExposureMinor: integer('current_exposure_minor').default(0).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active | suspended | closed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
