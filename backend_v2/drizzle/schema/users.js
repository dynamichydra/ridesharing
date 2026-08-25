import { pgTable, uuid, varchar, boolean, timestamp, decimal, text } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';
import { states } from './states.js';
import { cities } from './cities.js';
import { userStatusEnum } from './enums.js';

export const users = pgTable('users', {
  id:          uuid('id').primaryKey().defaultRandom(),
  phone:       varchar('phone', { length: 15 }).unique().notNull(),
  name:        varchar('name', { length: 100 }),
  email:       varchar('email', { length: 255 }).unique(),
  avatar:      text('avatar'),
  fcmToken:    text('fcm_token'),
  isVerified:  boolean('is_verified').default(false),
  isBlocked:   boolean('is_blocked').default(false),
  status:      userStatusEnum('status').default('active'),
  rating:      decimal('rating', { precision: 3, scale: 2 }).default('5.00'),
  totalRides:  varchar('total_rides').default('0'),

  // ── Location (admin-settable, mirrors drivers.countryId/stateId/cityId) ─────
  countryId:   uuid('country_id').references(() => countries.id),
  stateId:     uuid('state_id').references(() => states.id),
  cityId:      uuid('city_id').references(() => cities.id),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});
