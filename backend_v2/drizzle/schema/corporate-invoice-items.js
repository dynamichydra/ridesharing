import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { corporateInvoices } from './corporate-invoices.js';
import { rides } from './rides.js';
import { users } from './users.js';

export const corporateInvoiceItems = pgTable('corporate_invoice_items', {
  id:           uuid('id').primaryKey().defaultRandom(),
  invoiceId:    uuid('invoice_id').references(() => corporateInvoices.id).notNull(),
  rideId:       uuid('ride_id').references(() => rides.id).notNull(),
  employeeId:   uuid('employee_id').references(() => users.id).notNull(),
  amountMinor:  integer('amount_minor').notNull(),
  taxMinor:     integer('tax_minor').default(0).notNull(),
  totalMinor:   integer('total_minor').notNull(),
  currencyCode: varchar('currency_code', { length: 3 }).notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
});
