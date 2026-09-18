import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

// Persisted in-app notification history — every dispatch through notification-dispatch.service.js
// (both the legacy title/body shape and the new template-driven shape) writes one row here per
// channel sent, regardless of whether the external channel (push/SMS/email) actually delivered.
// This is what a future "notification bell" / in-app list reads from — today nothing persisted
// anything, push was pure fire-and-forget.
export const notifications = pgTable('notifications', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull(),
  userType:   varchar('user_type', { length: 10 }).notNull(),  // driver | rider
  eventType:  varchar('event_type', { length: 100 }),
  channel:    varchar('channel', { length: 20 }),               // push | sms | email
  title:      varchar('title', { length: 255 }),
  body:       text('body'),
  data:       jsonb('data'),                                    // e.g. { rideId }
  isRead:     boolean('is_read').default(false),
  readAt:     timestamp('read_at'),
  createdAt:  timestamp('created_at').defaultNow(),
}, (t) => ({
  ownerIdx: index('notifications_owner_idx').on(t.userId, t.userType, t.createdAt),
}));
