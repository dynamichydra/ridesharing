/**
 * seed.js — Full seed data for RideShare Platform
 *
 * Usage:
 *   cp .env.example .env   (fill DATABASE_URL)
 *   npm run db:migrate
 *   node seed.js
 *
 * What it seeds:
 *   1.  1  super admin
 *   2.  3  vehicle types   (Bike, Auto, Cab)
 *   3.  3  zones           (City Centre, Airport, Suburb)
 *   4.  5  fare rules      (Night surge, peak hours, evening peak, traffic, airport zone)
 *   5.  4  subscription plans (Monthly, Quarterly, Yearly, Lifetime)
 *   6.  5  riders
 *   7. 10  drivers         (various statuses & vehicle types)
 *   8.  5  active driver subscriptions
 *   9. 12  rides           (various statuses)
 *  10.  3  audit log entries
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import bcrypt from 'bcryptjs';

// ── schema imports ────────────────────────────────────────────────────────────
import {
  admins,
  vehicleTypes,
  zones,
  fareRules,
  subscriptionPlans,
  subscriptions,
  users,
  drivers,
  rides,
  auditLogs,
} from './drizzle/schema/index.js';

// ── DB connection ─────────────────────────────────────────────────────────────
// Parse manually so special chars in the password (e.g. @) are properly decoded
// before being handed to pg — pg's URL parser does NOT decode %40 etc.
// drizzle v1 RC requires { client: pool } — passing pool directly is silently ignored.
const _dbUrl = new URL(process.env.DATABASE_URL);
const pool = new pg.Pool({
  host:     _dbUrl.hostname,
  port:     parseInt(_dbUrl.port || '5432', 10),
  database: _dbUrl.pathname.replace(/^\//, ''),
  user:     decodeURIComponent(_dbUrl.username),
  password: decodeURIComponent(_dbUrl.password),
});
const db = drizzle({ client: pool });

// ── helpers ───────────────────────────────────────────────────────────────────

function daysFromNow(n) {
  return new Date(Date.now() + n * 86_400_000);
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000);
}

function randomFare(min, max) {
  return String((Math.random() * (max - min) + min).toFixed(2));
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

  // ── 2. Vehicle Types ────────────────────────────────────────────────────────
  log.section('2. Vehicle Types');

  const [vtBike] = await db.insert(vehicleTypes).values({
    name:        'Bike',
    slug:        'bike',
    capacity:     1,
    baseRate:    '15.00',
    perKmRate:   '6.00',
    perMinRate:  '0.50',
    minFare:     '30.00',
    sortOrder:    1,
    isActive:     true,
    createdBy:    superAdmin?.id,
  }).onConflictDoNothing().returning();

  const [vtAuto] = await db.insert(vehicleTypes).values({
    name:        'Auto',
    slug:        'auto',
    capacity:     3,
    baseRate:    '25.00',
    perKmRate:   '10.00',
    perMinRate:  '0.75',
    minFare:     '50.00',
    sortOrder:    2,
    isActive:     true,
    createdBy:    superAdmin?.id,
  }).onConflictDoNothing().returning();

  const [vtCab] = await db.insert(vehicleTypes).values({
    name:        'Cab',
    slug:        'cab',
    capacity:     4,
    baseRate:    '50.00',
    perKmRate:   '14.00',
    perMinRate:  '1.00',
    minFare:     '80.00',
    sortOrder:    3,
    isActive:     true,
    createdBy:    superAdmin?.id,
  }).onConflictDoNothing().returning();

  const [vtPremium] = await db.insert(vehicleTypes).values({
    name:        'Premium Cab',
    slug:        'premium-cab',
    capacity:     4,
    baseRate:    '100.00',
    perKmRate:   '20.00',
    perMinRate:  '1.50',
    minFare:     '150.00',
    sortOrder:    4,
    isActive:     true,
    createdBy:    superAdmin?.id,
  }).onConflictDoNothing().returning();

  log.ok(`Bike        (base ₹15 + ₹6/km + ₹0.50/min, min ₹30)`);
  log.ok(`Auto        (base ₹25 + ₹10/km + ₹0.75/min, min ₹50)`);
  log.ok(`Cab         (base ₹50 + ₹14/km + ₹1.00/min, min ₹80)`);
  log.ok(`Premium Cab (base ₹100 + ₹20/km + ₹1.50/min, min ₹150)`);

  // ── 3. Zones ────────────────────────────────────────────────────────────────
  log.section('3. Zones (Kolkata)');

  const [zoneCityCentre] = await db.insert(zones).values({
    name:        'Kolkata City Centre',
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

  log.ok(`City Centre  (1.00x) — Park Street, BBD Bagh`);
  log.ok(`Airport Zone (1.50x) — NSCBI Airport`);
  log.ok(`Salt Lake & New Town (1.10x)`);

  // ── 4. Fare Rules ───────────────────────────────────────────────────────────
  log.section('4. Fare Rules');

  await db.insert(fareRules).values([
    {
      name:        'Night Surge',
      ruleType:    'time',
      startTime:   '22:00',
      endTime:     '05:00',
      daysOfWeek:  [0, 1, 2, 3, 4, 5, 6],
      multiplier:  '1.50',
      priority:    10,
      isActive:    true,
      // null vehicleTypeId = applies to all vehicle types
    },
    {
      name:        'Morning Peak Hours',
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
      ruleType:       'traffic',
      trafficDelayS:  600,   // 10 minutes of delay
      multiplier:     '1.20',
      priority:       5,
      isActive:       true,
    },
    {
      name:        'Airport Zone Premium',
      ruleType:    'zone',
      multiplier:  '1.30',
      priority:    6,
      zoneId:       zoneAirport?.id,
      isActive:    true,
    },
    {
      name:        'Weekend Night Surge',
      ruleType:    'time',
      startTime:   '23:00',
      endTime:     '04:00',
      daysOfWeek:  [5, 6],  // Friday, Saturday
      multiplier:  '2.00',
      priority:    12,
      isActive:    true,
    },
  ]).onConflictDoNothing();

  log.ok(`Night Surge           — 10 PM–5 AM daily          ×1.50`);
  log.ok(`Morning Peak          — 8:00–10:30 AM weekdays    ×1.25`);
  log.ok(`Evening Peak          — 5:30–8 PM weekdays        ×1.30`);
  log.ok(`Heavy Traffic Surge   — when delay ≥10 min        ×1.20`);
  log.ok(`Airport Zone Premium  — airport zone rides         ×1.30`);
  log.ok(`Weekend Night Surge   — Fri/Sat 11 PM–4 AM        ×2.00`);

  // ── 5. Subscription Plans ───────────────────────────────────────────────────
  log.section('5. Subscription Plans');

  const [planMonthly] = await db.insert(subscriptionPlans).values({
    name:           'Monthly Plan',
    type:           'monthly',
    price:          '999.00',
    durationDays:    30,
    trialDays:        3,
    features:        ['Unlimited rides', 'Priority matching', 'No commission cut', '24/7 support'],
    maxRidesPerDay:  null,
    sortOrder:        1,
    isActive:         true,
  }).onConflictDoNothing().returning();

  const [planQuarterly] = await db.insert(subscriptionPlans).values({
    name:           'Quarterly Plan',
    type:           'quarterly',
    price:          '2499.00',
    durationDays:    90,
    trialDays:        0,
    features:        ['Unlimited rides', 'Priority matching', 'No commission cut', '24/7 support', 'Save ₹498 vs monthly'],
    maxRidesPerDay:  null,
    sortOrder:        2,
    isActive:         true,
  }).onConflictDoNothing().returning();

  const [planYearly] = await db.insert(subscriptionPlans).values({
    name:           'Yearly Plan',
    type:           'yearly',
    price:          '7999.00',
    durationDays:    365,
    trialDays:        7,
    features:        ['Unlimited rides', 'Priority matching', 'No commission cut', '24/7 support', 'Save ₹3989 vs monthly', 'Featured driver listing'],
    maxRidesPerDay:  null,
    sortOrder:        3,
    isActive:         true,
  }).onConflictDoNothing().returning();

  const [planLifetime] = await db.insert(subscriptionPlans).values({
    name:           'Lifetime Plan',
    type:           'lifetime',
    price:          '24999.00',
    durationDays:    null,    // no expiry
    trialDays:        0,
    features:        ['Unlimited rides forever', 'VIP support', 'One-time payment', 'All future features included', 'Priority matching always'],
    maxRidesPerDay:  null,
    sortOrder:        4,
    isActive:         true,
  }).onConflictDoNothing().returning();

  const [planWeekly] = await db.insert(subscriptionPlans).values({
    name:           'Weekly Trial Plan',
    type:           'weekly',
    price:          '299.00',
    durationDays:    7,
    trialDays:        0,
    features:        ['Unlimited rides', 'Basic support', 'No commission cut'],
    maxRidesPerDay:  20,
    sortOrder:        0,
    isActive:         true,
  }).onConflictDoNothing().returning();

  log.ok(`Monthly   — ₹999  / 30 days  (3-day trial)`);
  log.ok(`Quarterly — ₹2499 / 90 days`);
  log.ok(`Yearly    — ₹7999 / 365 days (7-day trial)`);
  log.ok(`Lifetime  — ₹24999 / forever`);
  log.ok(`Weekly    — ₹299  / 7 days   (max 20 rides/day)`);

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
    .values(driverData.map((d) => ({ ...d, isBlocked: d.isBlocked || false })))
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

  const planIds = [
    planMonthly?.id,
    planQuarterly?.id,
    planYearly?.id,
    planLifetime?.id,
    planMonthly?.id,    // reuse for 5th driver
  ].filter(Boolean);

  if (approvedOnlineDrivers.length && planIds.length) {
    const subValues = approvedOnlineDrivers.slice(0, 5).map((driver, i) => ({
      driverId:  driver.id,
      planId:    planIds[i % planIds.length],
      status:    'active',
      startDate: daysAgo(10),
      endDate:   planIds[i % planIds.length] === planLifetime?.id ? null : daysFromNow(20 + i * 5),
      paymentId: `pay_seed_${String(i + 1).padStart(6, '0')}`,
      orderId:   `order_seed_${String(i + 1).padStart(6, '0')}`,
      amount:    ['999.00', '2499.00', '7999.00', '24999.00', '999.00'][i],
    }));

    await db.insert(subscriptions).values(subValues).onConflictDoNothing();
    subValues.forEach((s, i) =>
      log.ok(`${approvedOnlineDrivers[i]?.name} → plan ${planIds[i % planIds.length]?.slice(-8)} active`),
    );
  }

  // Expired subscription for tapan
  const tapan = insertedDrivers.find((d) => d.name === 'Tapan Roy');
  if (tapan && planMonthly?.id) {
    await db.insert(subscriptions).values({
      driverId:  tapan.id,
      planId:    planMonthly.id,
      status:    'expired',
      startDate: daysAgo(40),
      endDate:   daysAgo(10),
      paymentId: 'pay_seed_expired_001',
      orderId:   'order_seed_expired_001',
      amount:    '999.00',
    }).onConflictDoNothing();
    log.ok(`Tapan Roy → monthly expired 10 days ago`);
  }

  // ── 9. Rides ────────────────────────────────────────────────────────────────
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

    const fareBreakdownBase = (base, dist, time, surge = 1) => ({
      baseFare:       base,
      distanceFare:   dist,
      timeFare:       time,
      subtotal:       base + dist + time,
      zoneMultiplier: 1.0,
      surgeMultiplier: surge,
      appliedSurges:  surge > 1 ? [{ name: 'Night Surge', multiplier: surge }] : [],
    });

    const ridesData = [
      // 1. completed — bike
      {
        riderId:       rider1.id,
        driverId:      driver1.id,
        vehicleTypeId: vtBike?.id,
        pickupLat: '22.5726', pickupLng: '88.3639', pickupAddress: 'Park Street, Kolkata',
        dropLat:   '22.5600', dropLng:   '88.3500', dropAddress:   'Kalighat, Kolkata',
        status:        'completed',
        estimatedFare: '85.00',
        finalFare:     '82.00',
        distanceKm:    '7.200',
        durationMin:    22,
        fareSnapshot:   fareBreakdownBase(15, 43.2, 11, 1),
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
        pickupLat: '22.5730', pickupLng: '88.3650', pickupAddress: 'Esplanade, Kolkata',
        dropLat:   '22.5958', dropLng:   '88.4286', dropAddress:   'Salt Lake Sector V',
        status:        'completed',
        estimatedFare: '145.00',
        finalFare:     '145.00',
        distanceKm:    '9.800',
        durationMin:    30,
        fareSnapshot:   fareBreakdownBase(25, 98, 22.5, 1),
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
        pickupLat: '22.5715', pickupLng: '88.3620', pickupAddress: 'New Market, Kolkata',
        dropLat:   '22.6450', dropLng:   '88.4450', dropAddress:   'Kolkata Airport',
        status:        'completed',
        estimatedFare: '420.00',
        finalFare:     '420.00',
        distanceKm:    '14.500',
        durationMin:    40,
        fareSnapshot:   fareBreakdownBase(50, 203, 40, 1.5),
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
        pickupLat: '22.5726', pickupLng: '88.3639', pickupAddress: 'Park Street, Kolkata',
        dropLat:   '22.5800', dropLng:   '88.4100', dropAddress:   'Salt Lake Sector I',
        status:        'started',
        estimatedFare: '110.00',
        distanceKm:    '8.100',
        durationMin:    28,
        fareSnapshot:   fareBreakdownBase(15, 48.6, 14, 1),
        requestedAt:   new Date(Date.now() - 600_000),
        acceptedAt:    new Date(Date.now() - 540_000),
        startedAt:     new Date(Date.now() - 300_000),
      },
      // 5. accepted (driver on way)
      {
        riderId:       rider2.id,
        driverId:      driver2.id,
        vehicleTypeId: vtAuto?.id,
        pickupLat: '22.5750', pickupLng: '88.3700', pickupAddress: 'Rabindra Sarani, Kolkata',
        dropLat:   '22.5600', dropLng:   '88.3400', dropAddress:   'Bhowanipore, Kolkata',
        status:        'accepted',
        estimatedFare: '90.00',
        distanceKm:    '5.200',
        durationMin:    18,
        fareSnapshot:   fareBreakdownBase(25, 52, 13.5, 1),
        requestedAt:   new Date(Date.now() - 120_000),
        acceptedAt:    new Date(Date.now() - 90_000),
      },
      // 6. cancelled by rider
      {
        riderId:       rider4.id,
        vehicleTypeId: vtCab?.id,
        pickupLat: '22.5726', pickupLng: '88.3639', pickupAddress: 'Park Street',
        dropLat:   '22.5200', dropLng:   '88.3800', dropAddress:   'Garia, Kolkata',
        status:        'cancelled',
        cancelledBy:   'rider',
        cancelReason:  'Changed plans',
        estimatedFare: '180.00',
        distanceKm:    '11.000',
        durationMin:    35,
        fareSnapshot:   fareBreakdownBase(50, 154, 35, 1),
        requestedAt:   daysAgo(1),
        cancelledAt:   new Date(daysAgo(1).getTime() + 60_000),
      },
      // 7. expired (no driver found)
      {
        riderId:       rider4.id,
        vehicleTypeId: vtPremium?.id,
        pickupLat: '22.4500', pickupLng: '88.2800', pickupAddress: 'Howrah Station',
        dropLat:   '22.5726', dropLng:   '88.3639', dropAddress:   'Park Street',
        status:        'expired',
        cancelledBy:   'system',
        cancelReason:  'No driver found',
        estimatedFare: '350.00',
        distanceKm:    '16.500',
        durationMin:    45,
        fareSnapshot:   fareBreakdownBase(100, 330, 67.5, 1),
        requestedAt:   daysAgo(4),
        cancelledAt:   new Date(daysAgo(4).getTime() + 75_000),
      },
      // 8. completed — premium airport run
      {
        riderId:       rider3.id,
        driverId:      driver7?.id,
        vehicleTypeId: vtPremium?.id,
        pickupLat: '22.5726', pickupLng: '88.3639', pickupAddress: 'Park Street, Kolkata',
        dropLat:   '22.6500', dropLng:   '88.4500', dropAddress:   'Kolkata Airport Terminal 2',
        status:        'completed',
        estimatedFare: '680.00',
        finalFare:     '680.00',
        distanceKm:    '18.300',
        durationMin:    50,
        fareSnapshot:   fareBreakdownBase(100, 366, 75, 1.3),
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
        pickupLat: '22.5726', pickupLng: '88.3639', pickupAddress: 'Kolkata',
        dropLat:   '22.5958', dropLng:   '88.4286', dropAddress:   'Salt Lake',
        status:        'completed',
        estimatedFare: randomFare(80, 250),
        finalFare:     randomFare(80, 250),
        distanceKm:    String((Math.random() * 10 + 3).toFixed(3)),
        durationMin:    Math.floor(Math.random() * 30 + 10),
        fareSnapshot:   fareBreakdownBase(25, 80, 15, 1),
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

  Vehicle Types:  Bike, Auto, Cab, Premium Cab
  Zones:          City Centre (×1.0), Airport (×1.5), Salt Lake (×1.1)
  Fare Rules:     Night Surge, Morning Peak, Evening Peak, Traffic, Airport, Weekend
  Plans:          Weekly, Monthly, Quarterly, Yearly, Lifetime
  Rides:          12 (various statuses)
${'═'.repeat(55)}
`);
}

seed()
  .catch((err) => { console.error('\n❌ Seed failed:', err); process.exit(1); })
  .finally(() => pool.end());
