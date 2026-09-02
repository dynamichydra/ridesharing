import { pgTable, uuid, varchar, boolean, timestamp, decimal, text, smallint, integer, date } from 'drizzle-orm/pg-core';
import { vehicleTypes } from './vehicle-types.js';
import { countries } from './countries.js';
import { states } from './states.js';
import { cities } from './cities.js';

import { driverStatusEnum, subscriptionStatusEnum, driverRegistrationStatusEnum, driverApprovalStatusEnum } from './enums.js';

export const drivers = pgTable('drivers', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  phone:              varchar('phone', { length: 20 }).unique(), // nullable — email-first signups may not have one yet
  name:               varchar('name', { length: 100 }),
  email:              varchar('email', { length: 255 }).unique(),
  profilePhoto:       text('profile_photo'),
  status:             driverStatusEnum('status').default('pending_approval'),

  // ── Personal info (Step 2) ──────────────────────────────────────────────
  dateOfBirth:        date('date_of_birth'),
  gender:             varchar('gender', { length: 20 }),   // male | female | other | prefer_not_to_say
  referralCode:       varchar('referral_code', { length: 20 }),
  referredByDriverId: uuid('referred_by_driver_id'),
  preferredLanguageCode: varchar('preferred_language_code', { length: 8 }),
  // ── Driving location (Step 4) ────────────────────────────────────────────
  countryId:          uuid('country_id').references(() => countries.id),
  stateId:            uuid('state_id').references(() => states.id),
  cityId:             uuid('city_id').references(() => cities.id),
  // ── Registration state machine ───────────────────────────────────────────
  registrationStatus: driverRegistrationStatusEnum('registration_status').default('new'),
  // new | mobile_verified | email_verified | registration_in_progress | documents_pending
  // | pending_review | under_verification | approved | rejected | suspended | active | inactive
  registrationStep:  integer('registration_step').default(0), // furthest completed step, 0-12
  licenseNumber:      varchar('license_number', { length: 50 }),
  licenseDoc:         text('license_doc'),
  aadharNumber:       varchar('aadhar_number', { length: 16 }),
  aadharDoc:          text('aadhar_doc'),
  vehicleTypeId:      uuid('vehicle_type_id').references(() => vehicleTypes.id),
  vehicleNumber:      varchar('vehicle_number', { length: 20 }),
  vehicleModel:       varchar('vehicle_model',  { length: 100 }),
  vehicleYear:        varchar('vehicle_year', { length: 4 }),
  approvalStatus:     driverApprovalStatusEnum('approval_status').default('pending'),
  // pending | approved | rejected
  approvalNote:       text('approval_note'),
  approvedBy:         uuid('approved_by'),
  approvedAt:         timestamp('approved_at'),
  isOnline:           boolean('is_online').default(false),
  isBlocked:          boolean('is_blocked').default(false),
  currentLat:         decimal('current_lat', { precision: 10, scale: 8 }),
  currentLng:         decimal('current_lng', { precision: 11, scale: 8 }),
  lastLocationAt:     timestamp('last_location_at'),
  fcmToken:           text('fcm_token'),
  rating:             decimal('rating', { precision: 3, scale: 2 }).default('5.00'),
  totalRatings:       smallint('total_ratings').default(0),
  totalRides:         integer('total_rides').default(0),
  subscriptionStatus: subscriptionStatusEnum('subscription_status').default('inactive'),

  // active | inactive | expired
  createdAt:          timestamp('created_at').defaultNow(),
  updatedAt:          timestamp('updated_at').defaultNow(),
});
