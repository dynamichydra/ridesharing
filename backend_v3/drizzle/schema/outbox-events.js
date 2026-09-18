import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, jsonb, integer, text, timestamp, index } from 'drizzle-orm/pg-core';

// Transactional outbox — a domain write and its event row are inserted in the same
// db.transaction (see utils/outbox.js enqueueEvent), so the event can never be lost to a
// crash/Kafka-outage between the DB commit and the publish the way a direct publishEvent()
// call can. outbox-relay.job.js is the only thing that reads status='pending' rows and
// actually calls publishEvent() for them.
export const outboxEvents = pgTable('outbox_events', {
  id:            uuid('id').primaryKey().defaultRandom(),
  aggregateType: varchar('aggregate_type', { length: 40 }).notNull(),
  aggregateId:   varchar('aggregate_id', { length: 120 }),
  topic:         varchar('topic', { length: 60 }).notNull(),
  eventKey:      varchar('event_key', { length: 120 }),
  payload:       jsonb('payload').notNull(),
  status:        varchar('status', { length: 12 }).notNull().default('pending'),
  // pending | published | failed | dead_letter
  attempts:      integer('attempts').notNull().default(0),
  lastError:     text('last_error'),
  availableAt:   timestamp('available_at').defaultNow().notNull(),
  publishedAt:   timestamp('published_at'),
  createdAt:     timestamp('created_at').defaultNow(),
  updatedAt:     timestamp('updated_at').defaultNow(),
}, (t) => ([
  index('outbox_pending_poll_idx').on(t.availableAt).where(sql`${t.status} = 'pending'`),
  index('outbox_aggregate_idx').on(t.aggregateType, t.aggregateId),
  index('outbox_status_created_idx').on(t.status, t.createdAt),
]));
