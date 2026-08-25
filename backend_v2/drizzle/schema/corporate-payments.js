import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { corporateAccounts } from './corporate-accounts.js';
import { corporateInvoices } from './corporate-invoices.js';

export const corporatePayments = pgTable('corporate_payments', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  corporateAccountId: uuid('corporate_account_id').references(() => corporateAccounts.id).notNull(),
  invoiceId:          uuid('invoice_id').references(() => corporateInvoices.id),
  amountMinor:        integer('amount_minor').notNull(),
  currencyCode:       varchar('currency_code', { length: 3 }).notNull(),
  paymentMethod:      varchar('payment_method', { length: 30 }).notNull(), // bank_transfer | card | ach | check
  gatewayPaymentId:   varchar('gateway_payment_id'),
  status:             varchar('status', { length: 20 }).default('completed').notNull(), // pending | completed | failed
  createdAt:          timestamp('created_at').defaultNow().notNull(),
});
