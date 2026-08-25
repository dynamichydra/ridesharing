import { pgTable, uuid, varchar, boolean, timestamp, integer, unique } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { vehicleTypes } from './vehicle-types.js';
import { vehicleModels } from './vehicle-models.js';

// One row per vehicle a driver registers. `drivers.vehicleTypeId/vehicleNumber/vehicleModel/vehicleYear`
// stay in sync as a mirror of the active vehicle for backward compatibility with fare/matching modules.
//
// vehicleTypeId/brand/model are denormalized copies resolved server-side from vehicleModelId
// (see vehicle.service.js#addVehicle) — the driver picks a catalog model, not a category, so a
// base-trim vehicle can't be self-declared as a premium one.
export const driverVehicles = pgTable('driver_vehicles', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  driverId:           uuid('driver_id').references(() => drivers.id).notNull(),
  vehicleModelId:     uuid('vehicle_model_id').references(() => vehicleModels.id).notNull(), // source of truth
  vehicleTypeId:      uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(), // rate/category class
  brand:              varchar('brand', { length: 60 }),
  model:              varchar('model', { length: 60 }).notNull(),
  year:               varchar('year', { length: 4 }).notNull(),
  color:              varchar('color', { length: 30 }),
  registrationNumber: varchar('registration_number', { length: 20 }).notNull(),
  vin:                varchar('vin', { length: 32 }),
  seats:              integer('seats').default(4),
  fuelType:           varchar('fuel_type', { length: 20 }),      // petrol | diesel | electric | hybrid | cng
  transmission:       varchar('transmission', { length: 20 }),   // manual | automatic
  isActive:           boolean('is_active').default(true),
  createdAt:          timestamp('created_at').defaultNow(),
  updatedAt:          timestamp('updated_at').defaultNow(),
}, (t) => ([
  unique().on(t.registrationNumber),
]));
