import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const vehicleTypes = pgTable('vehicle_types', {
  id:                uuid('id').primaryKey().defaultRandom(),
  name:              varchar('name', { length: 100 }).notNull(),
  code:              varchar('code', { length: 30 }).notNull(), // e.g. bike, auto, cab_economy, cab_premium
  slug:              varchar('slug', { length: 50 }),
  description:       text('description'),
  passengerCapacity: integer('passenger_capacity').default(4).notNull(),
  capacity:          integer('capacity').default(4), // backward compatibility alias
  luggageCapacity:   integer('luggage_capacity').default(1),
  sortOrder:         integer('sort_order').default(0),
  isActive:          boolean('is_active').default(true).notNull(),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  codeUnique:  uniqueIndex('vehicle_types_code_unique').on(table.code),
  activeIndex: index('vehicle_types_active_idx').on(table.isActive),
}));
