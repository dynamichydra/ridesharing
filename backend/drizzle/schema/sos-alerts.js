import { pgTable, uuid, varchar, text, decimal, timestamp } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { users } from './users.js';
import { admins } from './admins.js';

export const sosAlerts = pgTable('sos_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  rideId: uuid('ride_id').references(() => rides.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  userType: varchar('user_type', { length: 20 }).notNull(), // rider | driver
  lat: decimal('lat', { precision: 10, scale: 8 }),
  lng: decimal('lng', { precision: 11, scale: 8 }),
  status: varchar('status', { length: 20 }).default('triggered').notNull(), // triggered | acknowledged | resolved
  resolutionNotes: text('resolution_notes'),
  resolvedById: uuid('resolved_by_id').references(() => admins.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});
