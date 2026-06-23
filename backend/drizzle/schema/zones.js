import { pgTable, uuid, varchar, boolean, timestamp, decimal, jsonb } from 'drizzle-orm/pg-core';

export const zones = pgTable('zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 30 }).notNull(),   // city | large_city | suburb | airport | highway
  polygon: jsonb('polygon').notNull(),                  // GeoJSON polygon { type, coordinates }
  multiplier: decimal('multiplier', { precision: 4, scale: 2 }).default('1.00'),
  description: varchar('description', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
