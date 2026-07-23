import { pgTable, uuid, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { reconciliationRuns } from './reconciliation-runs.js';
import { payments } from './payments.js';

// One row per finding within a reconciliation run — never auto-corrected, only ever flagged
// for a human to review (see reconciliation.service.js resolveMismatch).
export const reconciliationMismatches = pgTable('reconciliation_mismatches', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  runId:              uuid('run_id').references(() => reconciliationRuns.id).notNull(),
  type:               varchar('type', { length: 20 }).notNull(),
  // missing_internal | missing_external | amount_mismatch | duplicate_internal
  gatewayPaymentId:   varchar('gateway_payment_id'),
  internalAmountMinor: integer('internal_amount_minor'),
  externalAmountMinor: integer('external_amount_minor'),
  paymentId:          uuid('payment_id').references(() => payments.id),
  status:             varchar('status', { length: 10 }).notNull().default('open'), // open | resolved | ignored
  resolvedBy:         uuid('resolved_by'),
  resolvedAt:         timestamp('resolved_at'),
  notes:              text('notes'),
  createdAt:          timestamp('created_at').defaultNow(),
});
