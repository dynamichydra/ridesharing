import { pgTable, uuid, integer, timestamp } from 'drizzle-orm/pg-core';
import { promos } from './promos.js';
import { users } from './users.js';
import { rides } from './rides.js';

export const promoUsages = pgTable('promo_usages', {
  id: uuid('id').primaryKey().defaultRandom(),
  promoId: uuid('promo_id').references(() => promos.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  rideId: uuid('ride_id').references(() => rides.id).notNull(),
  discountAmountMinor: integer('discount_amount_minor').notNull(),
  usedAt: timestamp('used_at').defaultNow().notNull(),
});
