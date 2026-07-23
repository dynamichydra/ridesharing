import { pgTable, uuid, varchar, integer, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { payments } from './payments.js';

// One row per processor dispute/chargeback, ingested from a webhook (see dispute.service.js
// handleDisputeEvent). `status` is stored as the processor's raw string — Stripe's is a fully
// typed enum, Razorpay's is not verified from the installed SDK, so this deliberately doesn't
// force either into a shared enum. Never auto-resolved; admins triage via dispute.routes.js.
export const disputes = pgTable('disputes', {
  id:               uuid('id').primaryKey().defaultRandom(),
  paymentId:        uuid('payment_id').references(() => payments.id), // nullable — set once the disputed payment is matched
  gateway:          varchar('gateway', { length: 20 }).notNull(),
  gatewayDisputeId: varchar('gateway_dispute_id').notNull(),
  amountMinor:      integer('amount_minor').notNull(),
  currencyCode:     varchar('currency_code', { length: 3 }).notNull(),
  reason:           varchar('reason', { length: 60 }),
  status:           varchar('status', { length: 30 }).notNull(),
  evidenceDueBy:    timestamp('evidence_due_by'),
  adminNotes:       text('admin_notes'), // triage notes only — never fed back to the processor
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
}, (t) => ([
  unique().on(t.gateway, t.gatewayDisputeId),
]));
