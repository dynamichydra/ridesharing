import { pgTable, uuid, varchar, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { promotionCampaigns } from './promotion-campaigns.js';
import { promos } from './promos.js';
import { countries } from './countries.js';
import { cities } from './cities.js';
import { vehicleTypes } from './vehicle-types.js';

export const promotionRules = pgTable('promotion_rules', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  campaignId:            uuid('campaign_id').references(() => promotionCampaigns.id),
  promoId:                uuid('promo_id').references(() => promos.id),
  discountType:          varchar('discount_type', { length: 20 }).notNull(), // percentage | fixed_amount
  percentageDiscount:    integer('percentage_discount'), // e.g. 20 for 20%
  fixedDiscountMinor:    integer('fixed_discount_minor'), // in minor units
  maxDiscountMinor:      integer('max_discount_minor'),
  minFareMinor:          integer('min_fare_minor').default(0).notNull(),
  eligibleCountryId:     uuid('eligible_country_id').references(() => countries.id),
  eligibleCityId:        uuid('eligible_city_id').references(() => cities.id),
  eligibleVehicleTypeId: uuid('eligible_vehicle_type_id').references(() => vehicleTypes.id),
  firstRideOnly:         boolean('first_ride_only').default(false).notNull(),
  allowedPaymentMethods: jsonb('allowed_payment_methods'), // e.g. ['card', 'upi', 'wallet']
  usageLimit:            integer('usage_limit'),
  perUserLimit:          integer('per_user_limit').default(1).notNull(),
  createdAt:             timestamp('created_at').defaultNow().notNull(),
  updatedAt:             timestamp('updated_at').defaultNow().notNull(),
});
