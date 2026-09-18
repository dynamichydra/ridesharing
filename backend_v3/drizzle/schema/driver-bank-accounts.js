import { pgTable, uuid, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { countries } from './countries.js';

// Raw bank/wallet PII storage — separate from driver_payout_accounts (which tracks the
// gateway-side payout *destination* and its admin-approval status). accountNumberEnc/
// walletNumberEnc are AES-256-GCM envelope-encrypted via utils/encryption.js; only
// accountNumberLast4 is ever returned by an API response. One row per driver — resubmitting
// (PUT /driver/bank-details) overwrites in place and flips the linked driver_payout_accounts
// row back to 'pending' for re-review, same convention driver-documents.js uses on re-upload.
// Design pre-dates this table's implementation — see docs/driver-registration-design.md §3.7.
export const driverBankAccounts = pgTable('driver_bank_accounts', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  driverId:           uuid('driver_id').references(() => drivers.id).notNull().unique(),
  countryId:          uuid('country_id').references(() => countries.id).notNull(),
  bankName:           varchar('bank_name', { length: 100 }),
  accountHolderName:  varchar('account_holder_name', { length: 100 }),
  accountNumberEnc:   text('account_number_enc'),        // AES-256-GCM envelope-encrypted
  accountNumberLast4: varchar('account_number_last4', { length: 4 }), // display only
  routingCode:        varchar('routing_code', { length: 30 }), // IFSC / SWIFT / sort code — country-specific label resolved client-side
  upiId:              varchar('upi_id', { length: 100 }), // e.g. 'driver@okhdfcbank' — a UPI VPA is a payment handle
  // meant to be shared (like an email address), not secret like an account number, so it's
  // stored in the clear — unlike accountNumberEnc/walletNumberEnc, no encrypt()/decrypt() round trip.
  walletProvider:     varchar('wallet_provider', { length: 40 }), // e.g. 'M-Pesa', country-specific
  walletNumberEnc:    text('wallet_number_enc'),
  isVerified:         boolean('is_verified').default(false),
  createdAt:          timestamp('created_at').defaultNow(),
  updatedAt:          timestamp('updated_at').defaultNow(),
});
