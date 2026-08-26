import { pgTable, uuid, varchar, boolean, text, timestamp } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { admins } from './admins.js';
import { payoutAccountStatusEnum } from './enums.js';

// One payout-destination row per driver. `status` follows the exact same convention as
// driver-documents.js (pending|approved|rejected, rejectionReason, verifiedBy, verifiedAt) —
// a payout can only ever execute against an 'approved' row, checked in code (see
// payout.service.js _selectEligiblePayout), not just documented. stripeDetailsSubmitted/
// stripePayoutsEnabled are synced from Stripe's own Connect account status but are
// informational only — they never bypass the admin approval gate.
export const driverPayoutAccounts = pgTable('driver_payout_accounts', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  driverId:               uuid('driver_id').references(() => drivers.id).notNull().unique(),
  gateway:                varchar('gateway', { length: 20 }).notNull(), // razorpay | stripe
  stripeAccountId:        varchar('stripe_account_id'),
  stripeDetailsSubmitted: boolean('stripe_details_submitted').default(false),
  stripePayoutsEnabled:   boolean('stripe_payouts_enabled').default(false),
  razorpayContactId:      varchar('razorpay_contact_id'),     // RazorpayX Contact — created from driver_bank_accounts
  razorpayFundAccountId:  varchar('razorpay_fund_account_id'), // RazorpayX Fund Account — what payout() actually pays into
  razorpayFundAccountType: varchar('razorpay_fund_account_type', { length: 20 }), // 'bank_account' | 'vpa' — picks the payout mode (IMPS vs UPI), see payout.service.js
  status:                 payoutAccountStatusEnum('status').default('pending'), // pending | approved | rejected
  rejectionReason:        text('rejection_reason'),
  verifiedBy:             uuid('verified_by').references(() => admins.id),
  verifiedAt:             timestamp('verified_at'),
  createdAt:              timestamp('created_at').defaultNow(),
  updatedAt:              timestamp('updated_at').defaultNow(),
});
