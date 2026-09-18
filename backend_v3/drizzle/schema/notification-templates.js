import { pgTable, uuid, varchar, boolean, timestamp, text, unique } from 'drizzle-orm/pg-core';
import { admins } from './admins.js';

// Admin-authored content for the dispatch pipeline in notification-dispatch.service.js.
// `eventType` is a free-text key matching one of notification-events.js's static registry
// entries (e.g. 'PAYMENT_SUCCESS') — not an FK, since the registry lives in code, not the DB.
// `bodyHtml` holds CKEditor-authored HTML for channel='email' ("Notification" in the portal's
// vocabulary) or plain {{variable}} text for channel='sms' ("Message") / channel='push'.
// `audience` narrows a template to one side of a two-sided event (e.g. a rider-facing vs
// driver-facing PAYMENT_SUCCESS copy); null means "applies to whichever audience asks."
export const notificationTemplates = pgTable('notification_templates', {
  id:            uuid('id').primaryKey().defaultRandom(),
  eventType:     varchar('event_type', { length: 100 }).notNull(),
  channel:       varchar('channel', { length: 20 }).notNull(),      // push | sms | email
  audience:      varchar('audience', { length: 20 }),               // driver | rider | null = either
  languageCode:  varchar('language_code', { length: 8 }).default('en'),
  subject:       varchar('subject', { length: 255 }),                // email only
  bodyHtml:      text('body_html').notNull(),
  isActive:      boolean('is_active').default(true),
  createdBy:     uuid('created_by').references(() => admins.id),
  createdAt:     timestamp('created_at').defaultNow(),
  updatedAt:     timestamp('updated_at').defaultNow(),
}, (t) => ({
  uniq: unique().on(t.eventType, t.channel, t.audience, t.languageCode),
}));
