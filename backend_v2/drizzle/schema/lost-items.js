import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { users } from './users.js';
import { drivers } from './drivers.js';

export const lostItems = pgTable('lost_items', {
  id:              uuid('id').primaryKey().defaultRandom(),
  rideId:          uuid('ride_id').references(() => rides.id).notNull(),
  reporterId:      uuid('reporter_id').references(() => users.id).notNull(),
  reporterRole:    varchar('reporter_role', { length: 20 }).notNull(), // rider | driver
  driverId:        uuid('driver_id').references(() => drivers.id),
  itemCategory:    varchar('item_category', { length: 50 }).notNull(), // phone | wallet | bag | keys | documents | clothing | other
  description:     text('description').notNull(),
  contactPhone:    varchar('contact_phone', { length: 20 }),
  photoUrl:        text('photo_url'),
  status:          varchar('status', { length: 30 }).default('open').notNull(), // open | driver_contacted | item_found | returning | returned | closed
  resolutionNotes: text('resolution_notes'),
  resolvedAt:      timestamp('resolved_at'),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
});
