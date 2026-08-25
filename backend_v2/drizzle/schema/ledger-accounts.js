import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { wallets } from './wallets.js';
import { legalEntities } from './legal-entities.js';

// Chart of accounts for the universal double-entry ledger.
// Supports both system accounts and user/driver/corporate wallet accounts.
export const ledgerAccounts = pgTable('ledger_accounts', {
  id:              uuid('id').primaryKey().defaultRandom(),
  type:            varchar('type', { length: 20 }).default('system').notNull(), // system | wallet | corporate | escrow
  accountCategory: varchar('account_category', { length: 20 }).default('ASSET'), // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE | CLEARING
  subType:         varchar('sub_type', { length: 60 }), // RIDER_RECEIVABLE | DRIVER_PAYABLE | PLATFORM_REVENUE | TAX_PAYABLE | PSP_CLEARING | PROMO_LIABILITY | etc.
  code:            varchar('code', { length: 100 }), // Unique system code e.g. 'processor_clearing:razorpay'
  currencyCode:    varchar('currency_code', { length: 3 }).notNull(),
  walletId:        uuid('wallet_id').references(() => wallets.id).unique(), // set when type = 'wallet'
  ownerType:       varchar('owner_type', { length: 30 }), // rider | driver | corporate | platform | tax_authority
  ownerId:         uuid('owner_id'),
  legalEntityId:   uuid('legal_entity_id').references(() => legalEntities.id),
  status:          varchar('status', { length: 20 }).default('active').notNull(), // active | frozen | closed
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
}, (t) => ([
  unique().on(t.code, t.currencyCode),
]));
