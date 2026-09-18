import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { users } from './users.js';

export const ridePassengers = pgTable('ride_passengers', {
  id:               uuid('id').primaryKey().defaultRandom(),
  rideId:           uuid('ride_id').references(() => rides.id).notNull(),
  riderId:          uuid('rider_id').references(() => users.id).notNull(),
  passengerType:    varchar('passenger_type', { length: 20 }).default('other').notNull(), // self | other
  name:             varchar('name', { length: 100 }).notNull(),
  phoneCountryCode: varchar('phone_country_code', { length: 8 }).default('+91'),
  phoneNumber:      varchar('phone_number', { length: 20 }).notNull(),
  email:            varchar('email', { length: 255 }),
  isPrimary:        boolean('is_primary').default(true).notNull(),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
});
