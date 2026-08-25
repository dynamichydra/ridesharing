import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const states = pgTable('states', {
  id:        uuid('id').primaryKey().defaultRandom(),
  countryId: uuid('country_id').references(() => countries.id).notNull(),
  name:      varchar('name', { length: 100 }).notNull(),
  code:      varchar('code', { length: 10 }),
  isActive:  boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});
