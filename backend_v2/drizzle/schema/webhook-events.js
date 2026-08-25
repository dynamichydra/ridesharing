import { pgTable, uuid, varchar, text, jsonb, integer, timestamp, unique } from 'drizzle-orm/pg-core';

// One row per inbound processor webhook delivery, keyed by (gateway, eventId, domain) so a
// redelivered webhook (processors do this on timeout) is a no-op instead of reprocessing —
// see ride-payment/subscription/rider-subscription .routes.js webhook handlers. `domain`
// scopes the dedup per receiving route since the same eventId could theoretically arrive at
// more than one of the three webhook endpoints if misrouted.
// `rawBody` is the raw HTTP body, kept only for audit/debugging. `payload` is the already
// parsed+verified event (parseAndVerifyWebhook()'s return value) — that's what the async
// worker actually processes, since re-deriving it from rawBody later would mean re-running
// gateway-specific signature verification outside the request that had the signature header.
export const webhookEvents = pgTable('webhook_events', {
  id:         uuid('id').primaryKey().defaultRandom(),
  gateway:    varchar('gateway', { length: 20 }).notNull(),
  eventId:    varchar('event_id', { length: 120 }).notNull(),
  domain:     varchar('domain', { length: 30 }).notNull(), // ride_payment | driver_subscription | rider_subscription | payout
  rawBody:    text('raw_body').notNull(),
  payload:    jsonb('payload').notNull(),
  status:     varchar('status', { length: 12 }).notNull().default('received'),
  // received | processing | processed | failed | dead_letter
  attempts:   integer('attempts').notNull().default(0),
  lastError:  text('last_error'),
  createdAt:  timestamp('created_at').defaultNow(),
  updatedAt:  timestamp('updated_at').defaultNow(),
}, (t) => ([
  unique().on(t.gateway, t.eventId, t.domain),
]));
