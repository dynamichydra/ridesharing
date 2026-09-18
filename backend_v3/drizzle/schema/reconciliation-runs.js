import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

// One row per reconciliation.job.js run — summarizes a diff between our `payments` records and
// the processor's own transaction list for a time window. Findings live in
// reconciliation-mismatches.js, one row per run.
export const reconciliationRuns = pgTable('reconciliation_runs', {
  id:             uuid('id').primaryKey().defaultRandom(),
  gateway:        varchar('gateway', { length: 20 }).notNull(),
  windowFrom:     timestamp('window_from').notNull(),
  windowTo:       timestamp('window_to').notNull(),
  totalInternal:  integer('total_internal').notNull().default(0),
  totalExternal:  integer('total_external').notNull().default(0),
  mismatchCount:  integer('mismatch_count').notNull().default(0),
  status:         varchar('status', { length: 10 }).notNull().default('completed'), // completed | failed
  createdAt:      timestamp('created_at').defaultNow(),
});
