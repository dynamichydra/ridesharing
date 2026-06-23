import { pgTable, uuid, varchar, boolean, timestamp, decimal, text, smallint } from 'drizzle-orm/pg-core';
import { vehicleTypes } from './vehicle-types.js';

export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 15 }).unique().notNull(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }),
  profilePhoto: text('profile_photo'),
  licenseNumber: varchar('license_number', { length: 50 }),
  licenseDoc: text('license_doc'),
  aadharNumber: varchar('aadhar_number', { length: 16 }),
  aadharDoc: text('aadhar_doc'),
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id),
  vehicleNumber: varchar('vehicle_number', { length: 20 }),
  vehicleModel: varchar('vehicle_model', { length: 100 }),
  vehiclePhoto: text('vehicle_photo'),
  vehicleYear: varchar('vehicle_year', { length: 4 }),
  approvalStatus: varchar('approval_status').default('pending'),
  // pending | approved | rejected
  approvalNote: text('approval_note'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  isOnline: boolean('is_online').default(false),
  isBlocked: boolean('is_blocked').default(false),
  currentLat: decimal('current_lat', { precision: 10, scale: 8 }),
  currentLng: decimal('current_lng', { precision: 11, scale: 8 }),
  lastLocationAt: timestamp('last_location_at'),
  fcmToken: text('fcm_token'),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('5.00'),
  totalRatings: smallint('total_ratings').default(0),
  totalRides: smallint('total_rides').default(0),
  subscriptionStatus: varchar('subscription_status').default('inactive'),
  // active | inactive | expired
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
