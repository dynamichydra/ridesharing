import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions.js';
import { subscriptionEventTypeEnum, subscriptionStatusEnum } from './enums.js';

export const subscriptionEvents = pgTable('subscription_events', {
  id:             uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'cascade' }).notNull(),
  eventType:      subscriptionEventTypeEnum('event_type').notNull(),
  fromStatus:     subscriptionStatusEnum('from_status'),
  toStatus:       subscriptionStatusEnum('to_status'),
  actorType:      varchar('actor_type', { length: 30 }).default('system').notNull(), // driver | admin | system | webhook
  actorId:        uuid('actor_id'),
  reason:         varchar('reason', { length: 255 }),
  metadata:       jsonb('metadata'), // payload snapshot, payment attempt info, dates
  createdAt:      timestamp('created_at').defaultNow().notNull(),
}, (t) => ([
  index('sub_events_subscription_idx').on(t.subscriptionId, t.createdAt),
  index('sub_events_type_idx').on(t.eventType),
]));
