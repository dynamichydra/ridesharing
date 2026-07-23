import { pgTable, uuid, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { payoutBatches } from './payout-batches.js';
import { driverPayoutAccounts } from './driver-payout-accounts.js';

// One row per payout attempt. amountMinor is a snapshot of the driver's wallet balance taken
// at the moment the row is created (see payout.service.js runPayoutBatch) — the wallet itself
// is only debited once the gateway call actually succeeds, never before.
export const payouts = pgTable('payouts', {
  id:               uuid('id').primaryKey().defaultRandom(),
  driverId:         uuid('driver_id').references(() => drivers.id).notNull(),
  batchId:          uuid('batch_id').references(() => payoutBatches.id), // null = admin-triggered instant payout
  payoutAccountId:  uuid('payout_account_id').references(() => driverPayoutAccounts.id).notNull(),
  amountMinor:      integer('amount_minor').notNull(),
  currencyCode:     varchar('currency_code', { length: 3 }).notNull(),
  gateway:          varchar('gateway', { length: 20 }).notNull(),
  gatewayPayoutId:  varchar('gateway_payout_id'),
  status:           varchar('status', { length: 12 }).notNull().default('pending'), // pending | processing | completed | failed
  failureReason:    text('failure_reason'),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
});
