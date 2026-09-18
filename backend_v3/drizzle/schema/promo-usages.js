import { pgTable, uuid, integer, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { promos } from './promos.js';
import { users } from './users.js';
import { rides } from './rides.js';
import { couponRedemptionStatusEnum } from './enums.js';

export const promoUsages = pgTable('promo_usages', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  promoId:             uuid('promo_id').references(() => promos.id).notNull(),
  userId:              uuid('user_id').references(() => users.id).notNull(),
  rideId:              uuid('ride_id').references(() => rides.id),
  discountAmountMinor: integer('discount_amount_minor').notNull(),
  status:              couponRedemptionStatusEnum('status').default('reserved').notNull(), // reserved | redeemed | cancelled | expired
  usedAt:              timestamp('used_at').defaultNow().notNull(),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
}, (t) => ([
  unique().on(t.promoId, t.rideId),
  index('promo_usages_promo_idx').on(t.promoId),
  index('promo_usages_user_idx').on(t.userId),
  index('promo_usages_ride_idx').on(t.rideId),
  index('promo_usages_status_idx').on(t.status),
]));
