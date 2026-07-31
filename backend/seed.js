/**
 * seed.js — Full seed data for RideShare Platform
 *
 * Usage:
 *   cp .env.example .env   (fill DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD)
 *   npm run db:migrate
 *   node seed.js
 *
 * What it seeds:
 *   1.  1  super admin
 *   2.  2  countries       (India — default, Canada)
 *   3.  4  vehicle types   (Bike, Auto, Cab, Premium Cab) — global catalog, flat global rate
 *   4. 11  vehicle models  (brand/model → type catalog, e.g. Splendor → Bike)
 *   5.  5  zones           (3 Kolkata, 2 Toronto)
 *   6.  7  fare rules      (1 global, 5 India-scoped, 1 Canada-scoped)
 *   7.  2  tax rules       (India GST, Canada HST)
 *   8.  7  subscription plans (5 India/INR, 2 Canada/CAD)
 *   9.  5  riders
 *  10. 10  drivers         (various statuses & vehicle types, all India for this seed)
 *  11.  5  active driver subscriptions + 1 expired
 *  12. 12  rides           (various statuses)
 *  13.  3  audit log entries
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import bcrypt from 'bcryptjs';

// ── schema imports ────────────────────────────────────────────────────────────
import {
  admins,
  vehicleTypes,
  vehicleModels,
  zones,
  fareRules,
  commissionRules,
  notificationTemplates,
  taxRules,
  subscriptionPlans,
  subscriptions,
  users,
  drivers,
  rides,
  auditLogs,
  countries,
  states,
  cities,
  languages,
  documentTypes,
  legalDocuments,
  onboardingQuestions,
  translations,
} from './drizzle/schema/index.js';

// ── DB connection ─────────────────────────────────────────────────────────────
// drizzle v1 RC requires { client: pool } — passing pool directly is silently ignored.
const pool = new pg.Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
const db = drizzle({ client: pool });

// ── helpers ───────────────────────────────────────────────────────────────────

function daysFromNow(n) {
  return new Date(Date.now() + n * 86_400_000);
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000);
}

// Minor-unit random fare (₹80–250 -> 8000–25000 paise), matching fare.service.js's
// integer-minor-unit convention everywhere money is stored.
function randomFareMinor(minMajor, maxMajor) {
  return Math.round((Math.random() * (maxMajor - minMajor) + minMajor) * 100);
}

// ── console helper ─────────────────────────────────────────────────────────────
const log = {
  section: (t) => console.log(`\n${'─'.repeat(50)}\n  ${t}\n${'─'.repeat(50)}`),
  ok:      (t) => console.log(`  ✅ ${t}`),
  skip:    (t) => console.log(`  ⏭  ${t}`),
  err:     (t) => console.error(`  ❌ ${t}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SEED
// ═══════════════════════════════════════════════════════════════════════════════

async function seed() {
  console.log('\n🌱  RideShare Platform — Seed Script\n');

  // ── 1. Admin ────────────────────────────────────────────────────────────────
  log.section('1. Admin');

  const [superAdmin] = await db
    .insert(admins)
    .values({
      email:    'admin@rideshare.com',
      password: await bcrypt.hash('Admin@123456', 10),   // change in production!
      name:     'Super Admin',
      role:     'super_admin',
      isActive:  true,
    })
    .onConflictDoNothing()
    .returning();

  const [opAdmin] = await db
    .insert(admins)
    .values({
      email:    'ops@rideshare.com',
      password: await bcrypt.hash('Ops@123456', 10),
      name:     'Operations Admin',
      role:     'admin',
      isActive:  true,
    })
    .onConflictDoNothing()
    .returning();

  log.ok(`Super admin → admin@rideshare.com / Admin@123456`);
  log.ok(`Ops admin   → ops@rideshare.com   / Ops@123456`);

  // ── 1b. Geography & Languages ───────────────────────────────────────────────
  // Two countries on purpose — this is the seed that proves the model isn't secretly
  // single-market: different currency, different subscription plans, different tax
  // rule, same code path throughout. Vehicle-type rates are flat/global (no per-country
  // rate card), so pricing itself doesn't vary by country.
  log.section('1b. Geography & Languages');

  await db.insert(languages).values([
    { code: 'en', name: 'English', nativeName: 'English', isDefault: true, isActive: true },
    { code: 'hi', name: 'Hindi',   nativeName: 'हिन्दी',   isDefault: false, isActive: true },
  ]).onConflictDoNothing();

  const [india] = await db.insert(countries).values({
    name: 'India', isoCode: 'IN', dialCode: '+91', currencyCode: 'INR',
    defaultLanguageCode: 'en', timezone: 'Asia/Kolkata', roundingIncrementMinor: 1,
    isDefault: true, isActive: true, sortOrder: 1,
  }).onConflictDoNothing().returning();

  const [canada] = await db.insert(countries).values({
    name: 'Canada', isoCode: 'CA', dialCode: '+1', currencyCode: 'CAD',
    defaultLanguageCode: 'en', timezone: 'America/Toronto', roundingIncrementMinor: 5, // cash rounds to the nickel
    isDefault: false, isActive: true, sortOrder: 2,
  }).onConflictDoNothing().returning();

  const [westBengal] = await db.insert(states).values({
    countryId: india?.id, name: 'West Bengal', code: 'WB', isActive: true,
  }).onConflictDoNothing().returning();

  const [ontario] = await db.insert(states).values({
    countryId: canada?.id, name: 'Ontario', code: 'ON', isActive: true,
  }).onConflictDoNothing().returning();

  const [kolkata] = await db.insert(cities).values({
    stateId: westBengal?.id, countryId: india?.id, name: 'Kolkata',
    timezone: 'Asia/Kolkata', isActive: true, sortOrder: 1,
  }).onConflictDoNothing().returning();

  const [toronto] = await db.insert(cities).values({
    stateId: ontario?.id, countryId: canada?.id, name: 'Toronto',
    timezone: 'America/Toronto', isActive: true, sortOrder: 1,
  }).onConflictDoNothing().returning();

  log.ok(`India (default, INR)  → West Bengal → Kolkata`);
  log.ok(`Canada (CAD)          → Ontario → Toronto`);
  log.ok(`Languages: English (default), Hindi`);

  // ── 1c. Document Types ───────────────────────────────────────────────────────
  log.section('1c. Document Types');

  await db.insert(documentTypes).values([
    { code: 'DRIVERS_LICENSE', requiresFront: true, requiresBack: true, requiresExpiry: true, requiresDocNumber: true, maxFileSizeMb: 10, sortOrder: 1 },
    { code: 'VEHICLE_REGISTRATION', requiresFront: true, requiresBack: false, requiresExpiry: true, requiresDocNumber: true, sortOrder: 2 },
    { code: 'INSURANCE_CERTIFICATE', requiresFront: true, requiresBack: false, requiresExpiry: true, requiresDocNumber: true, sortOrder: 3 },
    { code: 'NATIONAL_ID', requiresFront: true, requiresBack: true, requiresExpiry: false, requiresDocNumber: true, sortOrder: 4 },
  ]).onConflictDoNothing();

  log.ok(`Driver's License, Vehicle Registration, Insurance Certificate, National ID`);

  // ── 1d. Legal Documents ──────────────────────────────────────────────────────
  log.section('1d. Legal Documents');

  await db.insert(legalDocuments).values([
    { type: 'terms', version: '1.0', countryId: null, contentUrl: 'https://cdn.example.com/legal/terms-v1.0.html', effectiveFrom: new Date(), isActive: true },
    { type: 'privacy_policy', version: '1.0', countryId: null, contentUrl: 'https://cdn.example.com/legal/privacy-v1.0.html', effectiveFrom: new Date(), isActive: true },
  ]).onConflictDoNothing();

  log.ok(`Terms v1.0, Privacy Policy v1.0 (global)`);

  // ── 1e. Onboarding Questionnaire ─────────────────────────────────────────────
  log.section('1e. Onboarding Questionnaire');

  const [qOwnVehicle] = await db.insert(onboardingQuestions).values({
    code: 'own_vehicle', questionType: 'yes_no', isRequired: true, sortOrder: 1, isActive: true,
  }).onConflictDoNothing().returning();

  const [qWeeklyHours] = await db.insert(onboardingQuestions).values({
    code: 'weekly_hours', questionType: 'number', isRequired: true, sortOrder: 2, isActive: true, minValue: 1, maxValue: 80,
  }).onConflictDoNothing().returning();

  const [qWorkedBefore] = await db.insert(onboardingQuestions).values({
    code: 'worked_before', questionType: 'yes_no', isRequired: false, sortOrder: 3, isActive: true,
  }).onConflictDoNothing().returning();

  if (qOwnVehicle?.id) {
    await db.insert(onboardingQuestions).values({
      code: 'rental_interest', questionType: 'yes_no', isRequired: false, sortOrder: 4, isActive: true,
      dependsOnQuestionId: qOwnVehicle.id, dependsOnOperator: 'equals', dependsOnValue: false,
    }).onConflictDoNothing();
  }

  const questionLabels = [
    [qOwnVehicle?.id, 'Do you own a vehicle?'],
    [qWeeklyHours?.id, 'How many hours per week can you drive?'],
    [qWorkedBefore?.id, 'Have you worked with another ride-sharing platform?'],
  ].filter(([id]) => id);

  if (questionLabels.length) {
    await db.insert(translations).values(
      questionLabels.map(([entityId, value]) => ({
        entityType: 'onboarding_question', entityId, fieldName: 'label', languageCode: 'en', value,
      })),
    ).onConflictDoNothing();
  }

  log.ok(`4 onboarding questions (own_vehicle, weekly_hours, worked_before, rental_interest)`);

  // ── 2. Vehicle Types (global catalog, flat global rate — no per-country cards) ─
  log.section('2. Vehicle Types (catalog + flat rate)');

  const [vtBike] = await db.insert(vehicleTypes).values({
    name: 'Bike', slug: 'bike', capacity: 1, sortOrder: 1, isActive: true, createdBy: superAdmin?.id,
    baseRateMinor: 1500, perKmRateMinor: 600, perMinRateMinor: 50, minFareMinor: 3000,
  }).onConflictDoNothing().returning();

  const [vtAuto] = await db.insert(vehicleTypes).values({
    name: 'Auto', slug: 'auto', capacity: 3, sortOrder: 2, isActive: true, createdBy: superAdmin?.id,
    baseRateMinor: 2500, perKmRateMinor: 1000, perMinRateMinor: 75, minFareMinor: 5000,
  }).onConflictDoNothing().returning();

  const [vtCab] = await db.insert(vehicleTypes).values({
    name: 'Cab', slug: 'cab', capacity: 4, sortOrder: 3, isActive: true, createdBy: superAdmin?.id,
    baseRateMinor: 5000, perKmRateMinor: 1400, perMinRateMinor: 100, minFareMinor: 8000,
  }).onConflictDoNothing().returning();

  const [vtPremium] = await db.insert(vehicleTypes).values({
    name: 'Premium Cab', slug: 'premium-cab', capacity: 4, sortOrder: 4, isActive: true, createdBy: superAdmin?.id,
    baseRateMinor: 10000, perKmRateMinor: 2000, perMinRateMinor: 150, minFareMinor: 15000,
  }).onConflictDoNothing().returning();

  log.ok(`Bike 15+6/km, Auto 25+10/km, Cab 50+14/km, Premium 100+20/km — same flat rate in every country`);

  // ── 2c. Vehicle Models (brand/model → type catalog) ────────────────────────
  // Drivers pick one of these when registering a vehicle instead of self-declaring a
  // vehicleTypeId — see vehicle.service.js#addVehicle. Prevents e.g. an old hatchback
  // being registered as "Premium Cab".
  log.section('2b. Vehicle Models (brand/model catalog)');

  const modelSlug = (brand, name) => `${brand}-${name}`.toLowerCase().replace(/\s+/g, '-');
  const vehicleModelRows = [
    { vehicleTypeId: vtBike?.id,    brand: 'Honda',        name: 'Splendor' },
    { vehicleTypeId: vtBike?.id,    brand: 'TVS',          name: 'Apache' },
    { vehicleTypeId: vtBike?.id,    brand: 'Hero',         name: 'Passion' },
    { vehicleTypeId: vtAuto?.id,    brand: 'Bajaj',        name: 'RE Auto' },
    { vehicleTypeId: vtAuto?.id,    brand: 'Piaggio',      name: 'Ape Auto' },
    { vehicleTypeId: vtCab?.id,     brand: 'Maruti Suzuki', name: 'WagonR' },
    { vehicleTypeId: vtCab?.id,     brand: 'Maruti Suzuki', name: 'Swift Dzire' },
    { vehicleTypeId: vtCab?.id,     brand: 'Hyundai',      name: 'i10' },
    { vehicleTypeId: vtPremium?.id, brand: 'Toyota',       name: 'Innova Crysta' },
    { vehicleTypeId: vtPremium?.id, brand: 'Toyota',       name: 'Fortuner' },
    { vehicleTypeId: vtPremium?.id, brand: 'Mahindra',     name: 'XUV700' },
  ].map((m, i) => ({ ...m, slug: modelSlug(m.brand, m.name), sortOrder: i + 1, isActive: true, createdBy: superAdmin?.id }));

  await db.insert(vehicleModels).values(vehicleModelRows).onConflictDoNothing();

  log.ok(`11 vehicle models seeded (Splendor/Apache/Passion → Bike, RE/Ape Auto → Auto, WagonR/Swift Dzire/i10 → Cab, Innova/Fortuner/XUV700 → Premium Cab)`);

  // ── 3. Zones ────────────────────────────────────────────────────────────────
  log.section('3. Zones');

  const [zoneCityCentre] = await db.insert(zones).values({
    name:        'Kolkata City Centre',
    countryId:   india?.id,
    type:        'city',
    multiplier:  '1.00',
    description: 'Central Kolkata — Park Street, BBD Bagh, Esplanade',
    polygon: {
      type: 'Polygon',
      coordinates: [[
        [88.3400, 22.5500],
        [88.3800, 22.5500],
        [88.3800, 22.5900],
        [88.3400, 22.5900],
        [88.3400, 22.5500],
      ]],
    },
    isActive: true,
  }).onConflictDoNothing().returning();

  const [zoneAirport] = await db.insert(zones).values({
    name:        'Kolkata Airport Zone',
    countryId:   india?.id,
    type:        'airport',
    multiplier:  '1.50',
    description: 'Netaji Subhas Chandra Bose International Airport area',
    polygon: {
      type: 'Polygon',
      coordinates: [[
        [88.4300, 22.6400],
        [88.4600, 22.6400],
        [88.4600, 22.6700],
        [88.4300, 22.6700],
        [88.4300, 22.6400],
      ]],
    },
    isActive: true,
  }).onConflictDoNothing().returning();

  const [zoneSuburb] = await db.insert(zones).values({
    name:        'Salt Lake & New Town',
    countryId:   india?.id,
    type:        'suburb',
    multiplier:  '1.10',
    description: 'Salt Lake City (Bidhannagar) and New Town Rajarhat',
    polygon: {
      type: 'Polygon',
      coordinates: [[
        [88.3900, 22.5700],
        [88.4700, 22.5700],
        [88.4700, 22.6300],
        [88.3900, 22.6300],
        [88.3900, 22.5700],
      ]],
    },
    isActive: true,
  }).onConflictDoNothing().returning();

  const [zoneTorontoDowntown] = await db.insert(zones).values({
    name:        'Toronto Downtown',
    countryId:   canada?.id,
    type:        'city',
    multiplier:  '1.00',
    description: 'Downtown Toronto core',
    polygon: {
      type: 'Polygon',
      coordinates: [[
        [-79.4100, 43.6300],
        [-79.3600, 43.6300],
        [-79.3600, 43.6700],
        [-79.4100, 43.6700],
        [-79.4100, 43.6300],
      ]],
    },
    isActive: true,
  }).onConflictDoNothing().returning();

  const [zonePearson] = await db.insert(zones).values({
    name:        'Pearson Airport Zone',
    countryId:   canada?.id,
    type:        'airport',
    multiplier:  '1.40',
    description: 'Toronto Pearson International Airport area',
    polygon: {
      type: 'Polygon',
      coordinates: [[
        [-79.6500, 43.6700],
        [-79.5900, 43.6700],
        [-79.5900, 43.7100],
        [-79.6500, 43.7100],
        [-79.6500, 43.6700],
      ]],
    },
    isActive: true,
  }).onConflictDoNothing().returning();

  log.ok(`India:  City Centre (1.00x), Airport (1.50x), Salt Lake & New Town (1.10x)`);
  log.ok(`Canada: Toronto Downtown (1.00x), Pearson Airport (1.40x)`);

  // ── 4. Fare Rules ───────────────────────────────────────────────────────────
  log.section('4. Fare Rules');

  await db.insert(fareRules).values([
    {
      name:        'Night Surge',
      countryId:   null,   // applies in every country — evaluated in each country's local timezone
      ruleType:    'time',
      startTime:   '22:00',
      endTime:     '05:00',
      daysOfWeek:  [0, 1, 2, 3, 4, 5, 6],
      multiplier:  '1.50',
      priority:    10,
      isActive:    true,
    },
    {
      name:        'Morning Peak Hours',
      countryId:   india?.id,
      ruleType:    'time',
      startTime:   '08:00',
      endTime:     '10:30',
      daysOfWeek:  [1, 2, 3, 4, 5],
      multiplier:  '1.25',
      priority:    8,
      isActive:    true,
    },
    {
      name:        'Evening Peak Hours',
      countryId:   india?.id,
      ruleType:    'time',
      startTime:   '17:30',
      endTime:     '20:00',
      daysOfWeek:  [1, 2, 3, 4, 5],
      multiplier:  '1.30',
      priority:    8,
      isActive:    true,
    },
    {
      name:           'Heavy Traffic Surge',
      countryId:      india?.id,
      ruleType:       'traffic',
      trafficDelayS:  600,   // 10 minutes of delay
      multiplier:     '1.20',
      priority:       5,
      isActive:       true,
    },
    {
      name:        'Airport Zone Premium',
      countryId:   india?.id,
      ruleType:    'zone',
      multiplier:  '1.30',
      priority:    6,
      zoneId:       zoneAirport?.id,
      isActive:    true,
    },
    {
      name:        'Weekend Night Surge',
      countryId:   india?.id,
      ruleType:    'time',
      startTime:   '23:00',
      endTime:     '04:00',
      daysOfWeek:  [5, 6],  // Friday, Saturday
      multiplier:  '2.00',
      priority:    12,
      isActive:    true,
    },
    {
      name:        'Pearson Airport Premium',
      countryId:   canada?.id,
      ruleType:    'zone',
      multiplier:  '1.25',
      priority:    6,
      zoneId:       zonePearson?.id,
      isActive:    true,
    },
  ]).onConflictDoNothing();

  log.ok(`Global:  Night Surge — 10 PM–5 AM daily ×1.50 (every country, local time)`);
  log.ok(`India:   Morning/Evening Peak, Heavy Traffic, Airport Zone, Weekend Night`);
  log.ok(`Canada:  Pearson Airport Premium ×1.25`);

  // ── 4b. Tax Rules ───────────────────────────────────────────────────────────
  log.section('4b. Tax Rules');

  await db.insert(taxRules).values([
    { countryId: india?.id, name: 'GST', appliesTo: 'subscription', rate: '0.1800', isInclusive: false, isActive: true },
    { countryId: canada?.id, name: 'HST', appliesTo: 'both', rate: '0.1300', isInclusive: false, isActive: true },
  ]).onConflictDoNothing();

  log.ok(`India:  GST 18% on subscriptions`);
  log.ok(`Canada: HST 13% on both fares and subscriptions`);

  // ── 4c. Commission Rules ─────────────────────────────────────────────────────
  // Global default only — resolveCommissionRule falls back to this when no country/vehicle-type
  // -specific row exists (see commission.service.js). Placeholder rates; an admin should tune
  // these from the portal before going live.
  log.section('4c. Commission Rules');

  await db.insert(commissionRules).values([
    {
      name: 'Global default',
      countryId: null, vehicleTypeId: null,
      bookingFeeMinor: 0,
      subscriberRate: '0.1500',    // 15% for drivers with an active subscription
      nonSubscriberRate: '0.2500', // 25% for drivers without one
      priority: 1,
      isActive: true,
    },
  ]).onConflictDoNothing();

  log.ok(`Global:  15% commission (subscribed) / 25% (unsubscribed), no booking fee`);

  // ── 5. Subscription Plans ───────────────────────────────────────────────────
  log.section('5. Subscription Plans');

  const [planMonthly] = await db.insert(subscriptionPlans).values({
    name:           'Monthly Plan',
    countryId:       india?.id,
    type:           'monthly',
    currencyCode:   'INR',
    priceMinor:      99900,
    durationDays:    30,
    trialDays:        3,
    features:        ['Unlimited rides', 'Priority matching', 'No commission cut', '24/7 support'],
    maxRidesPerDay:  null,
    sortOrder:        1,
    isActive:         true,
  }).onConflictDoNothing().returning();

  const [planQuarterly] = await db.insert(subscriptionPlans).values({
    name:           'Quarterly Plan',
    countryId:       india?.id,
    type:           'quarterly',
    currencyCode:   'INR',
    priceMinor:      249900,
    durationDays:    90,
    trialDays:        0,
    features:        ['Unlimited rides', 'Priority matching', 'No commission cut', '24/7 support', 'Save ₹498 vs monthly'],
    maxRidesPerDay:  null,
    sortOrder:        2,
    isActive:         true,
  }).onConflictDoNothing().returning();

  const [planYearly] = await db.insert(subscriptionPlans).values({
    name:           'Yearly Plan',
    countryId:       india?.id,
    type:           'yearly',
    currencyCode:   'INR',
    priceMinor:      799900,
    durationDays:    365,
    trialDays:        7,
    features:        ['Unlimited rides', 'Priority matching', 'No commission cut', '24/7 support', 'Save ₹3989 vs monthly', 'Featured driver listing'],
    maxRidesPerDay:  null,
    vehicleTypeIds:  [vtCab?.id, vtPremium?.id].filter(Boolean),
    priorityMatching: true,
    sortOrder:        3,
    isActive:         true,
  }).onConflictDoNothing().returning();

  const [planLifetime] = await db.insert(subscriptionPlans).values({
    name:           'Lifetime Plan',
    countryId:       india?.id,
    type:           'lifetime',
    currencyCode:   'INR',
    priceMinor:      2499900,
    durationDays:    null,    // no expiry
    trialDays:        0,
    features:        ['Unlimited rides forever', 'VIP support', 'One-time payment', 'All future features included', 'Priority matching always'],
    maxRidesPerDay:  null,
    priorityMatching: true,
    sortOrder:        4,
    isActive:         true,
  }).onConflictDoNothing().returning();

  const [planWeekly] = await db.insert(subscriptionPlans).values({
    name:           'Weekly Trial Plan',
    countryId:       india?.id,
    type:           'weekly',
    currencyCode:   'INR',
    priceMinor:      29900,
    durationDays:    7,
    trialDays:        0,
    features:        ['Unlimited rides', 'Basic support', 'No commission cut'],
    maxRidesPerDay:  20,
    sortOrder:        0,
    isActive:         true,
  }).onConflictDoNothing().returning();

  const [planMonthlyCA] = await db.insert(subscriptionPlans).values({
    name:           'Monthly Plan',
    countryId:       canada?.id,
    type:           'monthly',
    currencyCode:   'CAD',
    priceMinor:      4999,
    durationDays:    30,
    trialDays:        3,
    features:        ['Unlimited rides', 'Priority matching', 'No commission cut', '24/7 support'],
    maxRidesPerDay:  null,
    sortOrder:        1,
    isActive:         true,
  }).onConflictDoNothing().returning();

  const [planYearlyCA] = await db.insert(subscriptionPlans).values({
    name:           'Yearly Plan',
    countryId:       canada?.id,
    type:           'yearly',
    currencyCode:   'CAD',
    priceMinor:      49999,
    durationDays:    365,
    trialDays:        7,
    features:        ['Unlimited rides', 'Priority matching', 'No commission cut', '24/7 support', 'Save vs monthly'],
    maxRidesPerDay:  null,
    sortOrder:        2,
    isActive:         true,
  }).onConflictDoNothing().returning();

  log.ok(`India:  Weekly ₹299, Monthly ₹999, Quarterly ₹2499, Yearly ₹7999, Lifetime ₹24999`);
  log.ok(`Canada: Monthly $49.99, Yearly $499.99`);

  // ── 6. Riders ───────────────────────────────────────────────────────────────
  log.section('6. Riders');

  const riderData = [
    { phone: '+919876543210', name: 'Priya Sharma',    email: 'priya@example.com',   rating: '4.80' },
    { phone: '+919876543220', name: 'Amit Banerjee',   email: 'amit@example.com',    rating: '4.50' },
    { phone: '+919876543230', name: 'Sunita Ghosh',    email: 'sunita@example.com',  rating: '4.95' },
    { phone: '+919876543240', name: 'Rajan Mehta',     email: 'rajan@example.com',   rating: '3.80' },
    { phone: '+919876543250', name: 'Kavya Nair',      email: 'kavya@example.com',   rating: '5.00' },
  ];

  const insertedRiders = await db
    .insert(users)
    .values(riderData.map((r) => ({ ...r, isVerified: true, totalRides: '0' })))
    .onConflictDoNothing()
    .returning();

  insertedRiders.forEach((r) => log.ok(`${r.phone} → ${r.name}`));

  // ── 7. Drivers ──────────────────────────────────────────────────────────────
  // All India for this seed — Canada onboarding is proven via pricing/zones/plans above,
  // not by inventing a second driver roster with no rides to drive.
  log.section('7. Drivers');

  const driverData = [
    // approved + online — bike
    {
      phone:           '+919876543211',
      name:            'Rahul Kumar',
      email:           'rahul.driver@example.com',
      licenseNumber:   'WB2020001001',
      aadharNumber:    '1234567890000001',
      vehicleTypeId:    vtBike?.id,
      vehicleNumber:   'WB12AB1001',
      vehicleModel:    'Honda Activa 6G',
      vehicleYear:     '2022',
      approvalStatus:  'approved',
      subscriptionStatus: 'active',
      isOnline:         true,
      currentLat:      '22.5720',
      currentLng:      '88.3635',
      rating:          '4.85',
      totalRides:       120,
    },
    // approved + online — auto
    {
      phone:           '+919876543212',
      name:            'Suresh Mondal',
      email:           'suresh.driver@example.com',
      licenseNumber:   'WB2019001002',
      aadharNumber:    '1234567890000002',
      vehicleTypeId:    vtAuto?.id,
      vehicleNumber:   'WB12CD2002',
      vehicleModel:    'Bajaj RE Auto',
      vehicleYear:     '2021',
      approvalStatus:  'approved',
      subscriptionStatus: 'active',
      isOnline:         true,
      currentLat:      '22.5730',
      currentLng:      '88.3650',
      rating:          '4.60',
      totalRides:       250,
    },
    // approved + online — cab
    {
      phone:           '+919876543213',
      name:            'Bikash Das',
      email:           'bikash.driver@example.com',
      licenseNumber:   'WB2018001003',
      aadharNumber:    '1234567890000003',
      vehicleTypeId:    vtCab?.id,
      vehicleNumber:   'WB12EF3003',
      vehicleModel:    'Maruti Swift Dzire',
      vehicleYear:     '2023',
      approvalStatus:  'approved',
      subscriptionStatus: 'active',
      isOnline:         true,
      currentLat:      '22.5715',
      currentLng:      '88.3620',
      rating:          '4.92',
      totalRides:       430,
    },
    // approved + offline (sub expired)
    {
      phone:           '+919876543214',
      name:            'Tapan Roy',
      email:           'tapan.driver@example.com',
      licenseNumber:   'WB2021001004',
      aadharNumber:    '1234567890000004',
      vehicleTypeId:    vtBike?.id,
      vehicleNumber:   'WB12GH4004',
      vehicleModel:    'TVS Jupiter',
      vehicleYear:     '2020',
      approvalStatus:  'approved',
      subscriptionStatus: 'expired',
      isOnline:         false,
      rating:          '4.30',
      totalRides:       85,
    },
    // pending approval
    {
      phone:           '+919876543215',
      name:            'Arnab Sen',
      email:           'arnab.driver@example.com',
      licenseNumber:   'WB2022001005',
      aadharNumber:    '1234567890000005',
      vehicleTypeId:    vtAuto?.id,
      vehicleNumber:   'WB12IJ5005',
      vehicleModel:    'Piaggio Ape Auto',
      vehicleYear:     '2022',
      approvalStatus:  'pending',
      subscriptionStatus: 'inactive',
      isOnline:         false,
      rating:          '5.00',
      totalRides:       0,
    },
    // rejected
    {
      phone:           '+919876543216',
      name:            'Dipak Saha',
      licenseNumber:   'WB2017001006',
      aadharNumber:    '1234567890000006',
      vehicleTypeId:    vtCab?.id,
      vehicleNumber:   'WB12KL6006',
      vehicleModel:    'Hyundai i20',
      vehicleYear:     '2019',
      approvalStatus:  'rejected',
      approvalNote:    'License document expired. Please re-upload valid license.',
      subscriptionStatus: 'inactive',
      isOnline:         false,
      rating:          '5.00',
      totalRides:       0,
    },
    // approved + online — premium cab (near airport)
    {
      phone:           '+919876543217',
      name:            'Prosenjit Bose',
      email:           'prosenjit.driver@example.com',
      licenseNumber:   'WB2016001007',
      aadharNumber:    '1234567890000007',
      vehicleTypeId:    vtPremium?.id,
      vehicleNumber:   'WB12MN7007',
      vehicleModel:    'Toyota Innova Crysta',
      vehicleYear:     '2023',
      approvalStatus:  'approved',
      subscriptionStatus: 'active',
      isOnline:         true,
      currentLat:      '22.6450',
      currentLng:      '88.4450',
      rating:          '4.98',
      totalRides:       680,
    },
    // approved + online — bike (suburb area)
    {
      phone:           '+919876543218',
      name:            'Suman Halder',
      email:           'suman.driver@example.com',
      licenseNumber:   'WB2021001008',
      aadharNumber:    '1234567890000008',
      vehicleTypeId:    vtBike?.id,
      vehicleNumber:   'WB12OP8008',
      vehicleModel:    'Yamaha FZ-S',
      vehicleYear:     '2021',
      approvalStatus:  'approved',
      subscriptionStatus: 'active',
      isOnline:         true,
      currentLat:      '22.5800',
      currentLng:      '88.4100',
      rating:          '4.70',
      totalRides:       195,
    },
    // blocked
    {
      phone:           '+919876543219',
      name:            'Raju Pal',
      vehicleTypeId:    vtAuto?.id,
      vehicleNumber:   'WB12QR9009',
      vehicleModel:    'Mahindra Alfa Auto',
      vehicleYear:     '2018',
      approvalStatus:  'approved',
      subscriptionStatus: 'active',
      isOnline:         false,
      isBlocked:        true,
      rating:          '2.10',
      totalRides:       42,
    },
    // approved + online — cab (close to city centre)
    {
      phone:           '+919876543221',
      name:            'Manoj Chatterjee',
      email:           'manoj.driver@example.com',
      licenseNumber:   'WB2020001010',
      aadharNumber:    '1234567890000010',
      vehicleTypeId:    vtCab?.id,
      vehicleNumber:   'WB12ST0010',
      vehicleModel:    'Tata Tigor EV',
      vehicleYear:     '2023',
      approvalStatus:  'approved',
      subscriptionStatus: 'active',
      isOnline:         true,
      currentLat:      '22.5740',
      currentLng:      '88.3660',
      rating:          '4.80',
      totalRides:       310,
    },
  ];

  const insertedDrivers = await db
    .insert(drivers)
    .values(driverData.map((d) => ({
      ...d,
      isBlocked: d.isBlocked || false,
      countryId: india?.id,
      stateId: westBengal?.id,
      cityId: kolkata?.id,
      registrationStatus: d.isBlocked ? 'suspended'
        : d.approvalStatus === 'approved' ? 'approved'
        : d.approvalStatus === 'rejected' ? 'rejected'
        : 'pending_review',
      registrationStep: 12,
    })))
    .onConflictDoNothing()
    .returning();

  insertedDrivers.forEach((d) =>
    log.ok(`${d.phone} → ${d.name} [${d.approvalStatus}/${d.subscriptionStatus}]`),
  );

  // ── 8. Subscriptions ────────────────────────────────────────────────────────
  log.section('8. Driver Subscriptions');

  const approvedOnlineDrivers = insertedDrivers.filter(
    (d) => d.approvalStatus === 'approved' && d.subscriptionStatus === 'active' && !d.isBlocked,
  );

  const seedPlans = [planMonthly, planQuarterly, planYearly, planLifetime, planMonthly].filter((p) => p?.id);

  if (approvedOnlineDrivers.length && seedPlans.length) {
    const subValues = approvedOnlineDrivers.slice(0, 5).map((driver, i) => {
      const plan = seedPlans[i % seedPlans.length];
      return {
        driverId:     driver.id,
        planId:       plan.id,
        status:       'active',
        startDate:    daysAgo(10),
        endDate:      plan.id === planLifetime?.id ? null : daysFromNow(20 + i * 5),
        currencyCode: plan.currencyCode,
        amountMinor:  plan.priceMinor,
      };
    });

    await db.insert(subscriptions).values(subValues).onConflictDoNothing();
    subValues.forEach((s, i) =>
      log.ok(`${approvedOnlineDrivers[i]?.name} → plan ${s.planId?.slice(-8)} active`),
    );
  }

  // Expired subscription for tapan
  const tapan = insertedDrivers.find((d) => d.name === 'Tapan Roy');
  if (tapan && planMonthly?.id) {
    await db.insert(subscriptions).values({
      driverId:     tapan.id,
      planId:       planMonthly.id,
      status:       'expired',
      startDate:    daysAgo(40),
      endDate:      daysAgo(10),
      currencyCode: planMonthly.currencyCode,
      amountMinor:  planMonthly.priceMinor,
    }).onConflictDoNothing();
    log.ok(`Tapan Roy → monthly expired 10 days ago`);
  }

  // ── 9. Rides (all India/INR — Kolkata pickup points resolve to India via zones) ─
  log.section('9. Rides');

  if (insertedRiders.length >= 3 && insertedDrivers.length >= 3) {
    const rider1  = insertedRiders[0];
    const rider2  = insertedRiders[1];
    const rider3  = insertedRiders[2];
    const rider4  = insertedRiders[3];
    const driver1 = insertedDrivers[0];  // Rahul — bike
    const driver2 = insertedDrivers[1];  // Suresh — auto
    const driver3 = insertedDrivers[2];  // Bikash — cab
    const driver7 = insertedDrivers[6];  // Prosenjit — premium

    const fareBreakdownBase = (baseMinor, distMinor, timeMinor, surge = 1) => ({
      baseFareMinor:   baseMinor,
      distanceFareMinor: distMinor,
      timeFareMinor:   timeMinor,
      subtotalMinor:   baseMinor + distMinor + timeMinor,
      zoneMultiplier:  1.0,
      surgeMultiplier: surge,
      appliedSurges:   surge > 1 ? [{ name: 'Night Surge', multiplier: surge }] : [],
      minFareApplied:  false,
      taxMinor:        0,
    });

    const ridesData = [
      // 1. completed — bike
      {
        riderId:       rider1.id,
        driverId:      driver1.id,
        vehicleTypeId: vtBike?.id,
        countryId:     india?.id,
        currencyCode:  'INR',
        pickupLat: '22.5726', pickupLng: '88.3639', pickupAddress: 'Park Street, Kolkata',
        dropLat:   '22.5600', dropLng:   '88.3500', dropAddress:   'Kalighat, Kolkata',
        status:        'completed',
        estimatedFareMinor: 8500,
        finalFareMinor:     8200,
        distanceKm:    '7.200',
        durationMin:    22,
        fareSnapshot:   fareBreakdownBase(1500, 4320, 1100, 1),
        driverRating:   5,
        riderRating:    4,
        driverReview:  'Great rider!',
        requestedAt:   daysAgo(1),
        acceptedAt:    new Date(daysAgo(1).getTime() + 60_000),
        startedAt:     new Date(daysAgo(1).getTime() + 300_000),
        completedAt:   new Date(daysAgo(1).getTime() + 1_620_000),
      },
      // 2. completed — auto
      {
        riderId:       rider2.id,
        driverId:      driver2.id,
        vehicleTypeId: vtAuto?.id,
        countryId:     india?.id,
        currencyCode:  'INR',
        pickupLat: '22.5730', pickupLng: '88.3650', pickupAddress: 'Esplanade, Kolkata',
        dropLat:   '22.5958', dropLng:   '88.4286', dropAddress:   'Salt Lake Sector V',
        status:        'completed',
        estimatedFareMinor: 14500,
        finalFareMinor:     14500,
        distanceKm:    '9.800',
        durationMin:    30,
        fareSnapshot:   fareBreakdownBase(2500, 9800, 2250, 1),
        driverRating:   4,
        riderRating:    5,
        requestedAt:   daysAgo(2),
        acceptedAt:    new Date(daysAgo(2).getTime() + 90_000),
        startedAt:     new Date(daysAgo(2).getTime() + 420_000),
        completedAt:   new Date(daysAgo(2).getTime() + 2_220_000),
      },
      // 3. completed — cab night surge
      {
        riderId:       rider3.id,
        driverId:      driver3.id,
        vehicleTypeId: vtCab?.id,
        countryId:     india?.id,
        currencyCode:  'INR',
        pickupLat: '22.5715', pickupLng: '88.3620', pickupAddress: 'New Market, Kolkata',
        dropLat:   '22.6450', dropLng:   '88.4450', dropAddress:   'Kolkata Airport',
        status:        'completed',
        estimatedFareMinor: 42000,
        finalFareMinor:     42000,
        distanceKm:    '14.500',
        durationMin:    40,
        fareSnapshot:   fareBreakdownBase(5000, 20300, 4000, 1.5),
        driverRating:   5,
        riderRating:    5,
        driverReview:  'Excellent driver, very comfortable ride',
        requestedAt:   daysAgo(3),
        acceptedAt:    new Date(daysAgo(3).getTime() + 45_000),
        startedAt:     new Date(daysAgo(3).getTime() + 240_000),
        completedAt:   new Date(daysAgo(3).getTime() + 2_640_000),
      },
      // 4. started (in progress)
      {
        riderId:       rider1.id,
        driverId:      driver1.id,
        vehicleTypeId: vtBike?.id,
        countryId:     india?.id,
        currencyCode:  'INR',
        pickupLat: '22.5726', pickupLng: '88.3639', pickupAddress: 'Park Street, Kolkata',
        dropLat:   '22.5800', dropLng:   '88.4100', dropAddress:   'Salt Lake Sector I',
        status:        'started',
        estimatedFareMinor: 11000,
        distanceKm:    '8.100',
        durationMin:    28,
        fareSnapshot:   fareBreakdownBase(1500, 4860, 1400, 1),
        requestedAt:   new Date(Date.now() - 600_000),
        acceptedAt:    new Date(Date.now() - 540_000),
        startedAt:     new Date(Date.now() - 300_000),
      },
      // 5. accepted (driver on way)
      {
        riderId:       rider2.id,
        driverId:      driver2.id,
        vehicleTypeId: vtAuto?.id,
        countryId:     india?.id,
        currencyCode:  'INR',
        pickupLat: '22.5750', pickupLng: '88.3700', pickupAddress: 'Rabindra Sarani, Kolkata',
        dropLat:   '22.5600', dropLng:   '88.3400', dropAddress:   'Bhowanipore, Kolkata',
        status:        'accepted',
        estimatedFareMinor: 9000,
        distanceKm:    '5.200',
        durationMin:    18,
        fareSnapshot:   fareBreakdownBase(2500, 5200, 1350, 1),
        requestedAt:   new Date(Date.now() - 120_000),
        acceptedAt:    new Date(Date.now() - 90_000),
      },
      // 6. cancelled by rider
      {
        riderId:       rider4.id,
        vehicleTypeId: vtCab?.id,
        countryId:     india?.id,
        currencyCode:  'INR',
        pickupLat: '22.5726', pickupLng: '88.3639', pickupAddress: 'Park Street',
        dropLat:   '22.5200', dropLng:   '88.3800', dropAddress:   'Garia, Kolkata',
        status:        'cancelled',
        cancelledBy:   'rider',
        cancelReason:  'Changed plans',
        estimatedFareMinor: 18000,
        distanceKm:    '11.000',
        durationMin:    35,
        fareSnapshot:   fareBreakdownBase(5000, 15400, 3500, 1),
        requestedAt:   daysAgo(1),
        cancelledAt:   new Date(daysAgo(1).getTime() + 60_000),
      },
      // 7. expired (no driver found)
      {
        riderId:       rider4.id,
        vehicleTypeId: vtPremium?.id,
        countryId:     india?.id,
        currencyCode:  'INR',
        pickupLat: '22.4500', pickupLng: '88.2800', pickupAddress: 'Howrah Station',
        dropLat:   '22.5726', dropLng:   '88.3639', dropAddress:   'Park Street',
        status:        'expired',
        cancelledBy:   'system',
        cancelReason:  'No driver found',
        estimatedFareMinor: 35000,
        distanceKm:    '16.500',
        durationMin:    45,
        fareSnapshot:   fareBreakdownBase(10000, 33000, 6750, 1),
        requestedAt:   daysAgo(4),
        cancelledAt:   new Date(daysAgo(4).getTime() + 75_000),
      },
      // 8. completed — premium airport run
      {
        riderId:       rider3.id,
        driverId:      driver7?.id,
        vehicleTypeId: vtPremium?.id,
        countryId:     india?.id,
        currencyCode:  'INR',
        pickupLat: '22.5726', pickupLng: '88.3639', pickupAddress: 'Park Street, Kolkata',
        dropLat:   '22.6500', dropLng:   '88.4500', dropAddress:   'Kolkata Airport Terminal 2',
        status:        'completed',
        estimatedFareMinor: 68000,
        finalFareMinor:     68000,
        distanceKm:    '18.300',
        durationMin:    50,
        fareSnapshot:   fareBreakdownBase(10000, 36600, 7500, 1.3),
        driverRating:   5,
        driverReview:  'Professional driver. Excellent car.',
        requestedAt:   daysAgo(5),
        acceptedAt:    new Date(daysAgo(5).getTime() + 30_000),
        startedAt:     new Date(daysAgo(5).getTime() + 180_000),
        completedAt:   new Date(daysAgo(5).getTime() + 3_180_000),
      },
      // 9-12: historical completed rides for stats
      ...[6, 7, 8, 9].map((daysBack, idx) => ({
        riderId:       insertedRiders[idx % insertedRiders.length].id,
        driverId:      insertedDrivers[idx % 3].id,
        vehicleTypeId: [vtBike?.id, vtAuto?.id, vtCab?.id][idx % 3],
        countryId:     india?.id,
        currencyCode:  'INR',
        pickupLat: '22.5726', pickupLng: '88.3639', pickupAddress: 'Kolkata',
        dropLat:   '22.5958', dropLng:   '88.4286', dropAddress:   'Salt Lake',
        status:        'completed',
        estimatedFareMinor: randomFareMinor(80, 250),
        finalFareMinor:     randomFareMinor(80, 250),
        distanceKm:    String((Math.random() * 10 + 3).toFixed(3)),
        durationMin:    Math.floor(Math.random() * 30 + 10),
        fareSnapshot:   fareBreakdownBase(2500, 8000, 1500, 1),
        driverRating:   Math.floor(Math.random() * 2) + 4,
        requestedAt:   daysAgo(daysBack),
        acceptedAt:    new Date(daysAgo(daysBack).getTime() + 60_000),
        startedAt:     new Date(daysAgo(daysBack).getTime() + 360_000),
        completedAt:   new Date(daysAgo(daysBack).getTime() + 1_860_000),
      })),
    ];

    await db.insert(rides).values(ridesData.filter(Boolean)).onConflictDoNothing();
    log.ok(`12 rides inserted (completed, started, accepted, cancelled, expired)`);
  }

  // ── 10. Audit Logs ──────────────────────────────────────────────────────────
  log.section('10. Audit Logs');

  if (superAdmin?.id && insertedDrivers.length) {
    await db.insert(auditLogs).values([
      {
        actorId:    superAdmin.id,
        actorType:  'admin',
        action:     'DRIVER_APPROVED',
        entityType: 'driver',
        entityId:   insertedDrivers[0]?.id,
        meta:       { note: 'All documents verified. Approved.' },
        ip:         '127.0.0.1',
      },
      {
        actorId:    superAdmin.id,
        actorType:  'admin',
        action:     'DRIVER_REJECTED',
        entityType: 'driver',
        entityId:   insertedDrivers[5]?.id,
        meta:       { note: 'License document expired.' },
        ip:         '127.0.0.1',
      },
      {
        actorId:    superAdmin.id,
        actorType:  'admin',
        action:     'DRIVER_BLOCKED',
        entityType: 'driver',
        entityId:   insertedDrivers[8]?.id,
        meta:       { reason: 'Multiple rider complaints' },
        ip:         '127.0.0.1',
      },
    ]).onConflictDoNothing();
    log.ok('3 audit log entries created');
  }

  // ── 11. Notification Templates ────────────────────────────────────────────────
  // One row per (eventType, channel, audience) for the 3 call sites migrated to the
  // template-driven dispatch pipeline (see notification-events.js's NOTIFICATION_EVENTS and
  // src/kafka/consumers/index.js's resolveTemplate) — without these, publishNotification()
  // would find nothing to render and skip every send.
  log.section('11. Notification Templates');

  await db.insert(notificationTemplates).values([
    {
      eventType: 'PAYMENT_SUCCESS', channel: 'push', audience: 'rider',
      subject: null, bodyHtml: 'Your payment of {{amount}} for this ride has been recorded.',
      isActive: true, createdBy: superAdmin?.id,
    },
    {
      eventType: 'PAYMENT_SUCCESS', channel: 'push', audience: 'driver',
      subject: null, bodyHtml: 'Payment of {{amount}} ({{method}}) recorded for your ride.',
      isActive: true, createdBy: superAdmin?.id,
    },
    {
      eventType: 'SUBSCRIPTION_ACTIVATED', channel: 'push', audience: 'driver',
      subject: null, bodyHtml: 'Your {{planName}} plan is now active. Valid until {{endDate}}.',
      isActive: true, createdBy: superAdmin?.id,
    },
    {
      eventType: 'SUBSCRIPTION_ACTIVATED', channel: 'email', audience: 'driver',
      subject: 'Your {{planName}} subscription is active',
      bodyHtml: '<p>Your <strong>{{planName}}</strong> plan is now active, valid until {{endDate}}.</p>',
      isActive: true, createdBy: superAdmin?.id,
    },
    {
      eventType: 'DOCUMENT_REJECTED', channel: 'push', audience: 'driver',
      subject: null, bodyHtml: 'Document rejected: {{reason}}',
      isActive: true, createdBy: superAdmin?.id,
    },
    {
      eventType: 'DOCUMENT_REJECTED', channel: 'sms', audience: 'driver',
      subject: null, bodyHtml: 'RideShare: a document was rejected — {{reason}}',
      isActive: true, createdBy: superAdmin?.id,
    },
    {
      eventType: 'WALLET_TOPUP', channel: 'push', audience: null,
      subject: null, bodyHtml: 'Your wallet has been topped up by {{amount}}.',
      isActive: true, createdBy: superAdmin?.id,
    },
    {
      eventType: 'REFUND_REQUEST_APPROVED', channel: 'push', audience: 'rider',
      subject: null, bodyHtml: 'Your refund request for {{amount}} has been approved and processed.',
      isActive: true, createdBy: superAdmin?.id,
    },
    {
      eventType: 'REFUND_REQUEST_REJECTED', channel: 'push', audience: 'rider',
      subject: null, bodyHtml: 'Your refund request was not approved: {{reason}}',
      isActive: true, createdBy: superAdmin?.id,
    },
    {
      eventType: 'RIDE_DISPUTE_RESPONDED', channel: 'push', audience: null,
      subject: null, bodyHtml: 'There is a new response on your ride dispute.',
      isActive: true, createdBy: superAdmin?.id,
    },
    {
      eventType: 'RIDE_DISPUTE_RESOLVED', channel: 'push', audience: null,
      subject: null, bodyHtml: 'Your ride dispute has been {{status}}.',
      isActive: true, createdBy: superAdmin?.id,
    },
  ]).onConflictDoNothing();

  log.ok('11 notification templates seeded (PAYMENT_SUCCESS, SUBSCRIPTION_ACTIVATED, DOCUMENT_REJECTED, WALLET_TOPUP, REFUND_REQUEST_APPROVED/REJECTED, RIDE_DISPUTE_RESPONDED/RESOLVED)');

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`
${'═'.repeat(55)}
  ✅  SEED COMPLETE
${'═'.repeat(55)}

  Admin Credentials:
    Super Admin → admin@rideshare.com  / Admin@123456
    Ops Admin   → ops@rideshare.com    / Ops@123456

  Rider Test Phones (OTP: 123456 in dev mode):
    +919876543210  Priya Sharma
    +919876543220  Amit Banerjee
    +919876543230  Sunita Ghosh
    +919876543240  Rajan Mehta

  Driver Test Phones (OTP: 123456 in dev mode):
    +919876543211  Rahul Kumar      [approved / active sub / ONLINE  / bike]
    +919876543212  Suresh Mondal    [approved / active sub / ONLINE  / auto]
    +919876543213  Bikash Das       [approved / active sub / ONLINE  / cab]
    +919876543217  Prosenjit Bose   [approved / active sub / ONLINE  / premium]
    +919876543218  Suman Halder     [approved / active sub / ONLINE  / bike]
    +919876543221  Manoj Chatterjee [approved / active sub / ONLINE  / cab]
    +919876543214  Tapan Roy        [approved / EXPIRED sub / offline]
    +919876543215  Arnab Sen        [PENDING  / inactive]
    +919876543216  Dipak Saha       [REJECTED / inactive]
    +919876543219  Raju Pal         [BLOCKED  / active sub]

  Geography:      India (default, INR) → West Bengal → Kolkata
                  Canada (CAD) → Ontario → Toronto
  Document Types: Driver's License, Vehicle Registration, Insurance Certificate, National ID
  Legal Docs:     Terms v1.0, Privacy Policy v1.0 (global)
  Questions:      own_vehicle, weekly_hours, worked_before, rental_interest
  Vehicle Types:  Bike, Auto, Cab, Premium Cab (global catalog, flat global rate)
  Vehicle Models: 11 brand/model rows (Splendor/Apache/Passion → Bike, RE/Ape Auto → Auto,
                  WagonR/Swift Dzire/i10 → Cab, Innova/Fortuner/XUV700 → Premium Cab)
  Zones:          Kolkata City Centre/Airport/Salt Lake, Toronto Downtown/Pearson
  Fare Rules:     Night Surge (global) + 5 India-scoped + 1 Canada-scoped
  Tax Rules:      India GST 18% (subscription), Canada HST 13% (fare + subscription)
  Plans:          India: Weekly/Monthly/Quarterly/Yearly/Lifetime (INR)
                  Canada: Monthly/Yearly (CAD)
  Rides:          12 (various statuses, India/INR)
${'═'.repeat(55)}
`);
}

seed()
  .catch((err) => { console.error('\n❌ Seed failed:', err); process.exit(1); })
  .finally(() => pool.end());
