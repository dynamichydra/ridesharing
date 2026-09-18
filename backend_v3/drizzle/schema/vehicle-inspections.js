import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { driverVehicles } from './driver-vehicles.js';
import { drivers } from './drivers.js';
import { admins } from './admins.js';

export const vehicleInspections = pgTable('vehicle_inspections', {
  id:               uuid('id').primaryKey().defaultRandom(),
  vehicleId:        uuid('vehicle_id').references(() => driverVehicles.id).notNull(),
  driverId:         uuid('driver_id').references(() => drivers.id).notNull(),
  inspectorId:      uuid('inspector_id').references(() => admins.id),
  status:           varchar('status', { length: 20 }).default('pending').notNull(), // pending | passed | failed
  checklistResults: jsonb('checklist_results'), // e.g. { brakes: true, tires: true, lights: true, interior: true }
  notes:            text('notes'),
  inspectionDate:   timestamp('inspection_date').defaultNow().notNull(),
  expiresAt:        timestamp('expires_at'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
});
