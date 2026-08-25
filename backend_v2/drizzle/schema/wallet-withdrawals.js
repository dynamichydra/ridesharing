import { pgTable, uuid, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { wallets } from './wallets.js';
import { admins } from './admins.js';

// Rider self-service wallet cash-out request — the withdrawal-side counterpart to
// wallet.service.js's self-service top-up. Riders have no payout rail (no RazorpayX Contact/
// Fund Account, no Stripe Connect account — see rider-bank-accounts.js), so approval doesn't
// call a gateway the way a driver payout or a refund does: an admin reviews the request,
// manually wires the money to whatever bank/UPI/wallet details the rider has on file, and
// approval just records that it happened and debits the ledger. 'processing' is a transient
// state set inside the same row-locked transaction that verifies status='requested' (closing
// the race window before the ledger post — mirrors refund.service.js's requested->pending
// step) and flips to 'completed' on success or 'failed' if the ledger post is rejected (e.g.
// the wallet balance dropped between request and approval).
export const walletWithdrawals = pgTable('wallet_withdrawals', {
  id:               uuid('id').primaryKey().defaultRandom(),
  walletId:         uuid('wallet_id').references(() => wallets.id).notNull(),
  ownerType:        varchar('owner_type', { length: 10 }).notNull(), // 'rider' today; 'driver' reserved, not exposed via routes
  ownerId:          uuid('owner_id').notNull(),
  amountMinor:      integer('amount_minor').notNull(),
  currencyCode:     varchar('currency_code', { length: 3 }).notNull(),
  reason:           text('reason'),
  status:           varchar('status', { length: 12 }).notNull().default('requested'), // requested | processing | completed | rejected | failed
  rejectionReason:  text('rejection_reason'),
  reviewedById:     uuid('reviewed_by_id').references(() => admins.id),
  reviewedAt:       timestamp('reviewed_at'),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
});
