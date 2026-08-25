import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const riderPreferences = pgTable('rider_preferences', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  userId:               uuid('user_id').references(() => users.id).notNull().unique(),
  quietRide:            boolean('quiet_ride').default(false).notNull(),
  temperature:          varchar('temperature', { length: 20 }).default('no_preference').notNull(), // cool | warm | no_preference
  petFriendly:          boolean('pet_friendly').default(false).notNull(),
  wheelchairAccessible: boolean('wheelchair_accessible').default(false).notNull(),
  childSeat:            boolean('child_seat').default(false).notNull(),
  preferredLanguage:    varchar('preferred_language', { length: 10 }).default('en'),
  musicPreference:      varchar('music_preference', { length: 50 }),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
});
