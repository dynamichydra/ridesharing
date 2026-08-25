import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { corporateAccounts } from './corporate-accounts.js';

export const corporateInvoices = pgTable('corporate_invoices', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  corporateAccountId: uuid('corporate_account_id').references(() => corporateAccounts.id).notNull(),
  invoiceNumber:      varchar('invoice_number', { length: 60 }).notNull().unique(), // e.g. "INV-CORP-2026-001"
  periodStart:        timestamp('period_start').notNull(),
  periodEnd:          timestamp('period_end').notNull(),
  subtotalMinor:      integer('subtotal_minor').notNull(),
  taxMinor:           integer('tax_minor').default(0).notNull(),
  discountMinor:      integer('discount_minor').default(0).notNull(),
  totalMinor:         integer('total_minor').notNull(),
  paidAmountMinor:    integer('paid_amount_minor').default(0).notNull(),
  currencyCode:       varchar('currency_code', { length: 3 }).notNull(),
  status:             varchar('status', { length: 20 }).default('draft').notNull(), // draft | issued | paid | partially_paid | overdue | void
  dueAt:              timestamp('due_at').notNull(),
  paidAt:             timestamp('paid_at'),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
});
