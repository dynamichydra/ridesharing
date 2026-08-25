import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

// One row per payout-batch.job.js run — individual attempts live in payouts.js, linked via
// batchId. An admin-triggered instant payout (payout.service.js initiateInstantPayout) has no
// batch row — payouts.batchId is nullable for exactly that case.
export const payoutBatches = pgTable('payout_batches', {
  id:               uuid('id').primaryKey().defaultRandom(),
  gateway:          varchar('gateway', { length: 20 }).notNull(),
  status:           varchar('status', { length: 12 }).notNull().default('processing'), // processing | completed | failed
  totalAmountMinor: integer('total_amount_minor').notNull().default(0),
  driverCount:      integer('driver_count').notNull().default(0),
  createdAt:        timestamp('created_at').defaultNow(),
});
