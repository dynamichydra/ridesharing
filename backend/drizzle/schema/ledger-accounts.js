import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { wallets } from './wallets.js';

// Chart of accounts for the double-entry ledger (see ledger-transactions.js /
// ledger-entries.js). Two kinds of row:
//   - type='system'  — platform-owned accounts (processor clearing, revenue, memo accounts),
//                       identified by `code`+`currencyCode`, created lazily via
//                       ledgerService.getOrCreateSystemAccount().
//   - type='wallet'   — one per existing `wallets` row (driver/rider payable balance). The
//                       ledger treats a wallet as just another account so a single balanced
//                       transaction can debit a system account and credit a wallet; `wallets`/
//                       `wallet_transactions` stay the source of truth for balance *display*
//                       (unchanged shape for existing admin-portal/API readers) while the
//                       ledger becomes the source of truth for accounting correctness.
export const ledgerAccounts = pgTable('ledger_accounts', {
  id:           uuid('id').primaryKey().defaultRandom(),
  type:         varchar('type', { length: 10 }).notNull(), // system | wallet
  code:         varchar('code', { length: 60 }), // e.g. 'processor_clearing:razorpay' — null for wallet accounts
  currencyCode: varchar('currency_code', { length: 3 }).notNull(),
  walletId:     uuid('wallet_id').references(() => wallets.id).unique(), // set when type = 'wallet'
  createdAt:    timestamp('created_at').defaultNow(),
}, (t) => ([
  unique().on(t.code, t.currencyCode),
]));
