import { pgTable, uuid, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { payments } from './payments.js';

// One row per refund attempt against a payment — a payment can have several (partial
// refunds). "How much has been refunded so far" is SUM(amountMinor) over this payment's
// status='completed' rows, not a column on `payments` — payments.status only flips to
// 'refunded' once that sum equals the original payments.amountMinor (see refund.service.js).
export const refunds = pgTable('refunds', {
  id:               uuid('id').primaryKey().defaultRandom(),
  paymentId:        uuid('payment_id').references(() => payments.id).notNull(),
  amountMinor:      integer('amount_minor').notNull(),
  currencyCode:     varchar('currency_code', { length: 3 }).notNull(),
  reason:           text('reason'),
  status:           varchar('status', { length: 10 }).notNull().default('pending'), // pending | completed | failed
  gatewayRefundId:  varchar('gateway_refund_id'),
  initiatedByType:  varchar('initiated_by_type', { length: 10 }).notNull(), // admin | system
  initiatedById:    uuid('initiated_by_id'),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
});
