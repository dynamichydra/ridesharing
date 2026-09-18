import { pgTable, uuid, varchar, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const states = pgTable('states', {
  id:        uuid('id').primaryKey().defaultRandom(),
  countryId: uuid('country_id').references(() => countries.id).notNull(),
  name:      varchar('name', { length: 100 }).notNull(),
  code:      varchar('code', { length: 20 }),
  isActive:  boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  countryNameUnique: uniqueIndex('states_country_name_unique').on(table.countryId, table.name),
  countryIndex:      index('states_country_idx').on(table.countryId),
  activeIndex:       index('states_active_idx').on(table.isActive),
}));
