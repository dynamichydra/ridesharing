import { pgTable, uuid, varchar, text, decimal, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { savedPlaceLabelEnum } from './enums.js';

export const savedPlaces = pgTable('saved_places', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  label: savedPlaceLabelEnum('label').notNull(), // home | work | favorite | custom

  name: varchar('name', { length: 100 }), // e.g. "Home", "Downtown Office", "Gym"
  address: text('address').notNull(),
  lat: decimal('lat', { precision: 10, scale: 8 }).notNull(),
  lng: decimal('lng', { precision: 11, scale: 8 }).notNull(),
  isDefaultPickup: boolean('is_default_pickup').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
