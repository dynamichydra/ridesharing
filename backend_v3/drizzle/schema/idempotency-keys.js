import { pgTable, uuid, varchar, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';

// Backs utils/idempotency.js withIdempotency(). One row per (scope, key) pair — `scope`
// namespaces keys per call site (e.g. 'ride_payment_initiate', 'subscription_activation')
// so two different endpoints can't collide on a client-supplied key. `status='pending'`
// covers a request that's still in flight (a concurrent duplicate should be rejected, not
// re-run); `completed`/`failed` are terminal — completed replays `responseSnapshot`,
// failed allows a retry with the same key to re-run `fn`.
export const idempotencyKeys = pgTable('idempotency_keys', {
  id:               uuid('id').primaryKey().defaultRandom(),
  scope:            varchar('scope', { length: 60 }).notNull(),
  key:              varchar('key', { length: 120 }).notNull(),
  requesterId:      uuid('requester_id'),
  status:           varchar('status', { length: 10 }).notNull().default('pending'), // pending | completed | failed
  responseSnapshot: jsonb('response_snapshot'),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
}, (t) => ([
  unique().on(t.scope, t.key),
]));
