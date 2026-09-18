import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { payments } from './payments.js';
import { admins } from './admins.js';

// A rider/driver-facing complaint ticket against a specific ride — e.g. "overcharged",
// "driver never showed". Deliberately separate from `disputes` (drizzle/schema/disputes.js),
// which is the processor-chargeback table fed only by Razorpay/Stripe webhooks and never
// touched by end users. This table has no ledger/money side effects of its own; an admin who
// agrees with a complaint acts through the existing refund/wallet-adjustment endpoints.
export const rideDisputes = pgTable('ride_disputes', {
  id:              uuid('id').primaryKey().defaultRandom(),
  rideId:          uuid('ride_id').references(() => rides.id).notNull(),
  paymentId:       uuid('payment_id').references(() => payments.id), // latest payment for the ride at the time it was raised, if any
  raisedByType:    varchar('raised_by_type', { length: 10 }).notNull(), // rider | driver
  raisedById:      uuid('raised_by_id').notNull(),
  reason:          varchar('reason', { length: 60 }).notNull(), // e.g. 'overcharged', 'no_show', 'behavior'
  description:     text('description').notNull(),
  status:          varchar('status', { length: 20 }).default('open').notNull(),
  // open | responded | resolved | rejected
  responseText:    text('response_text'), // the other party's reply, if any
  respondedByType: varchar('responded_by_type', { length: 10 }), // rider | driver
  respondedById:   uuid('responded_by_id'),
  respondedAt:     timestamp('responded_at'),
  adminNotes:      text('admin_notes'), // set when an admin resolves/rejects the ticket
  resolvedById:    uuid('resolved_by_id').references(() => admins.id),
  resolvedAt:      timestamp('resolved_at'),
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
});
