import { pgTable, uuid, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { countries } from './countries.js';

// Rider-side counterpart to driver-bank-accounts.js — same field shape, but records-only:
// riders have no payout/withdrawal flow (see bank-account.routes.js), so there is no linked
// gateway/payout-account row and no RazorpayX Contact/Fund Account is ever created from this.
// isVerified is a plain admin-toggleable flag here, not a gated approval workflow.
export const riderBankAccounts = pgTable('rider_bank_accounts', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  riderId:            uuid('rider_id').references(() => users.id).notNull().unique(),
  countryId:          uuid('country_id').references(() => countries.id).notNull(),
  bankName:           varchar('bank_name', { length: 100 }),
  accountHolderName:  varchar('account_holder_name', { length: 100 }),
  accountNumberEnc:   text('account_number_enc'),        // AES-256-GCM envelope-encrypted
  accountNumberLast4: varchar('account_number_last4', { length: 4 }), // display only
  routingCode:        varchar('routing_code', { length: 30 }), // IFSC / SWIFT / sort code
  upiId:              varchar('upi_id', { length: 100 }), // shareable payment handle, stored in the clear
  walletProvider:     varchar('wallet_provider', { length: 40 }),
  walletNumberEnc:    text('wallet_number_enc'),
  isVerified:         boolean('is_verified').default(false),
  createdAt:          timestamp('created_at').defaultNow(),
  updatedAt:          timestamp('updated_at').defaultNow(),
});
