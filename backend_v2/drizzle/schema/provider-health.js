import { pgTable, uuid, varchar, integer, timestamp, text } from 'drizzle-orm/pg-core';

export const providerHealth = pgTable('provider_health', {
  id:            uuid('id').primaryKey().defaultRandom(),
  gateway:       varchar('gateway', { length: 30 }).notNull(),
  currencyCode:  varchar('currency_code', { length: 3 }),
  paymentMethod: varchar('payment_method', { length: 30 }),
  successCount:  integer('success_count').default(0).notNull(),
  failureCount:  integer('failure_count').default(0).notNull(),
  successRate:   integer('success_rate').default(100).notNull(), // percentage 0-100
  latencyMs:     integer('latency_ms').default(0).notNull(),
  circuitState:  varchar('circuit_state', { length: 20 }).default('closed').notNull(), // closed | half_open | open
  lastError:     text('last_error'),
  lastCheckedAt: timestamp('last_checked_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
});
