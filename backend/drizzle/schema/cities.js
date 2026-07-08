import { pgTable, uuid, varchar, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { states } from './states.js';
import { countries } from './countries.js';

export const cities = pgTable('cities', {
  id:        uuid('id').primaryKey().defaultRandom(),
  stateId:   uuid('state_id').references(() => states.id).notNull(),
  countryId: uuid('country_id').references(() => countries.id).notNull(), // denormalized for fast filtering
  name:      varchar('name', { length: 100 }).notNull(),
  timezone:  varchar('timezone', { length: 50 }),
  isActive:  boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
