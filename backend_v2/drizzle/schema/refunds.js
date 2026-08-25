import { pgTable, uuid, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { payments } from './payments.js';
import { admins } from './admins.js';

// One row per refund attempt against a payment — a payment can have several (partial
// refunds). "How much has been refunded so far" is SUM(amountMinor) over this payment's
// status='completed' rows, not a column on `payments` — payments.status only flips to
// 'refunded' once that sum equals the original payments.amountMinor (see refund.service.js).
// A rider-initiated row starts life as 'requested' (no gateway call yet — see
// refund.service.js requestRefund) and only becomes 'pending'/'completed'/'failed' once an
// admin approves it via reviewedById/reviewedAt; 'rejected' is a terminal admin decision that
// never touches the gateway. Admin-initiated refunds (refund.service.js initiateRefund) skip
// 'requested' entirely and go straight to 'pending' -> 'completed'/'failed'.
export const refunds = pgTable('refunds', {
  id:               uuid('id').primaryKey().defaultRandom(),
  paymentId:        uuid('payment_id').references(() => payments.id).notNull(),
  amountMinor:      integer('amount_minor').notNull(),
  currencyCode:     varchar('currency_code', { length: 3 }).notNull(),
  reason:           text('reason'),
  status:           varchar('status', { length: 10 }).notNull().default('pending'), // requested | pending | completed | failed | rejected
  gatewayRefundId:  varchar('gateway_refund_id'),
  initiatedByType:  varchar('initiated_by_type', { length: 10 }).notNull(), // admin | system | rider
  initiatedById:    uuid('initiated_by_id'),
  rejectionReason:  text('rejection_reason'), // set only when an admin rejects a rider's request
  reviewedById:     uuid('reviewed_by_id').references(() => admins.id), // admin who approved/rejected a rider request
  reviewedAt:       timestamp('reviewed_at'),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
});
