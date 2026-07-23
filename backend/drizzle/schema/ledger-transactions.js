import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

// One row per business event that moved money through the ledger — groups a balanced set
// of ledger_entries (see ledger-entries.js). `idempotencyKey` is how postTransaction()
// guarantees exactly-once posting: a retried call with the same key returns the existing
// row instead of posting again.
export const ledgerTransactions = pgTable('ledger_transactions', {
  id:              uuid('id').primaryKey().defaultRandom(),
  businessType:    varchar('business_type', { length: 40 }).notNull(),
  // ride_fare_online | ride_fare_cash | driver_subscription_charge | rider_subscription_charge | wallet_admin_adjustment
  idempotencyKey:  varchar('idempotency_key', { length: 120 }).unique(),
  referenceType:   varchar('reference_type', { length: 30 }), // ride | subscription | rider_subscription | wallet_adjustment
  referenceId:     uuid('reference_id'),
  metadata:        jsonb('metadata'),
  createdAt:       timestamp('created_at').defaultNow(),
});
