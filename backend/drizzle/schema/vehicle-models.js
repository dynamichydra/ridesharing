import { pgTable, uuid, varchar, boolean, timestamp, integer, unique } from 'drizzle-orm/pg-core';
import { vehicleTypes } from './vehicle-types.js';

// Brand/model -> vehicle type catalog (e.g. "Splendor" -> Bike, "Bullet" -> Premium Bike).
// A driver picks one of these when registering a vehicle instead of self-declaring a
// vehicleTypeId, so an old/base vehicle can't be entered under a premium category —
// see vehicle.service.js#addVehicle, which resolves vehicleTypeId from this table
// server-side rather than trusting whatever the client sends.
export const vehicleModels = pgTable('vehicle_models', {
  id:            uuid('id').primaryKey().defaultRandom(),
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  brand:         varchar('brand', { length: 60 }).notNull(),   // Honda, Royal Enfield, TVS
  name:          varchar('name', { length: 60 }).notNull(),    // Splendor, Bullet, Apache
  slug:          varchar('slug', { length: 120 }).unique().notNull(),
  sortOrder:     integer('sort_order').default(0),
  isActive:      boolean('is_active').default(true),
  createdBy:     uuid('created_by'),
  createdAt:     timestamp('created_at').defaultNow(),
  updatedAt:     timestamp('updated_at').defaultNow(),
}, (t) => ([
  unique().on(t.brand, t.name),
]));
