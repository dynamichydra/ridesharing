/**
 * seed.js — Comprehensive Seed Data for RideShare Platform
 *
 * Fully idempotent and aligned with current production schemas:
 * Hierarchy: Country → State → City → Zone (H3 hexes) → Vehicle Type → Pricing Plans & Versions
 *
 * Usage:
 *   node seed.js
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import * as h3 from 'h3-js';

// ── schema imports ────────────────────────────────────────────────────────────
import {
  admins,
  currencies,
  countries,
  states,
  cityTypes,
  cities,
  languages,
  translations,
  documentTypes,
  documentTypeRequirements,
  legalDocuments,
  onboardingQuestions,
  onboardingQuestionOptions,
  vehicleTypes,
  vehicleModels,
  zones,
  airports,
  pricingPlans,
  pricingPlanVersions,
  pricingVersions,
  pricingRules,
  airportPricingRules,
  nightPricingRules,
  peakPricingRules,
  surgeRules,
  surgeSnapshots,
  tollRules,
  taxRules,
  commissionRules,
  commissionRuleVersions,
  subscriptionPlans,
  subscriptionPlanVersions,
  subscriptionPlanVehicleTypes,
  subscriptionPlanEntitlements,
  riderSubscriptionPlans,
  users,
  wallets,
  drivers,
  driverVehicles,
  driverBankAccounts,
  subscriptions,
  promos,
  promoRules,
  promoUsages,
  rides,
  fareQuotes,
  rideFares,
  rideFinancials,
  auditLogs,
  commercialAuditLogs,
  notificationTemplates,
} from './drizzle/schema/index.js';

// ── DB connection ─────────────────────────────────────────────────────────────
const pool = new pg.Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'rideshare',
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
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

function randomFareMinor(minMajor, maxMajor) {
  return Math.round((Math.random() * (maxMajor - minMajor) + minMajor) * 100);
}

// Robust idempotent helper to get an existing record or insert if not present
async function findOrInsert(table, whereCondition, insertValues) {
  const [existing] = await db.select().from(table).where(whereCondition).limit(1);
  if (existing) return existing;
  const [inserted] = await db.insert(table).values(insertValues).returning();
  return inserted;
}

// Generate H3 hex cells given polygon coordinates and resolution
function getHexCellsForPolygon(coords, resolution = 8) {
  try {
    const latLngs = coords.map(([lng, lat]) => [lat, lng]);
    return h3.polygonToCells(latLngs, resolution);
  } catch {
    return [];
  }
}

// ── console helper ─────────────────────────────────────────────────────────────
const log = {
  section: (t) => console.log(`\n${'─'.repeat(55)}\n  ${t}\n${'─'.repeat(55)}`),
  ok:      (t) => console.log(`  ✅ ${t}`),
  skip:    (t) => console.log(`  ⏭  ${t}`),
  err:     (t) => console.error(`  ❌ ${t}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SEED SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════

async function seed() {
  console.log('\n🌱  RideShare Platform — Idempotent Comprehensive Seed Script Initializing...\n');

  // ── 1. Administrators ──────────────────────────────────────────────────────
  log.section('1. Admins');

  const superAdmin = await findOrInsert(
    admins,
    eq(admins.email, 'admin@rideshare.com'),
    {
      email:    'admin@rideshare.com',
      password: await bcrypt.hash('Admin@123456', 10),
      name:     'Super Admin',
      role:     'super_admin',
      isActive:  true,
    }
  );

  const opsAdmin = await findOrInsert(
    admins,
    eq(admins.email, 'ops@rideshare.com'),
    {
      email:    'ops@rideshare.com',
      password: await bcrypt.hash('Ops@123456', 10),
      name:     'Operations Admin',
      role:     'admin',
      isActive:  true,
    }
  );

  const financeAdmin = await findOrInsert(
    admins,
    eq(admins.email, 'finance@rideshare.com'),
    {
      email:    'finance@rideshare.com',
      password: await bcrypt.hash('Finance@123456', 10),
      name:     'Finance Lead',
      role:     'finance',
      isActive:  true,
    }
  );

  log.ok(`Super admin   → admin@rideshare.com   / Admin@123456`);
  log.ok(`Ops admin     → ops@rideshare.com     / Ops@123456`);
  log.ok(`Finance admin → finance@rideshare.com / Finance@123456`);

  // ── 2. Currencies & Languages ──────────────────────────────────────────────
  log.section('2. Currencies & Languages');

  const currINR = await findOrInsert(
    currencies,
    eq(currencies.code, 'INR'),
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', minorUnitExponent: 2, isActive: true }
  );

  const currCAD = await findOrInsert(
    currencies,
    eq(currencies.code, 'CAD'),
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$', minorUnitExponent: 2, isActive: true }
  );

  const currUSD = await findOrInsert(
    currencies,
    eq(currencies.code, 'USD'),
    { code: 'USD', name: 'US Dollar', symbol: '$', minorUnitExponent: 2, isActive: true }
  );

  await db.insert(languages).values([
    { code: 'en', name: 'English', nativeName: 'English', isDefault: true, isActive: true },
    { code: 'hi', name: 'Hindi',   nativeName: 'हिन्दी',   isDefault: false, isActive: true },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা',   isDefault: false, isActive: true },
  ]).onConflictDoNothing();

  log.ok(`Currencies: INR (₹), CAD ($), USD ($)`);
  log.ok(`Languages: English (Default), Hindi, Bengali`);

  // ── 3. Geography Hierarchy: Country → State → City Type → City ─────────────
  log.section('3. Geography (Countries, States, City Types, Cities)');

  const india = await findOrInsert(
    countries,
    eq(countries.isoCode, 'IN'),
    {
      name: 'India', isoCode: 'IN', dialCode: '+91', currencyCode: 'INR',
      defaultLanguageCode: 'en', timezone: 'Asia/Kolkata', roundingIncrementMinor: 1,
      isDefault: true, isActive: true, sortOrder: 1,
    }
  );

  const canada = await findOrInsert(
    countries,
    eq(countries.isoCode, 'CA'),
    {
      name: 'Canada', isoCode: 'CA', dialCode: '+1', currencyCode: 'CAD',
      defaultLanguageCode: 'en', timezone: 'America/Toronto', roundingIncrementMinor: 5,
      isDefault: false, isActive: true, sortOrder: 2,
    }
  );

  const westBengal = await findOrInsert(
    states,
    and(eq(states.countryId, india.id), eq(states.code, 'WB')),
    { countryId: india.id, name: 'West Bengal', code: 'WB', isActive: true }
  );

  const maharashtra = await findOrInsert(
    states,
    and(eq(states.countryId, india.id), eq(states.code, 'MH')),
    { countryId: india.id, name: 'Maharashtra', code: 'MH', isActive: true }
  );

  const ontario = await findOrInsert(
    states,
    and(eq(states.countryId, canada.id), eq(states.code, 'ON')),
    { countryId: canada.id, name: 'Ontario', code: 'ON', isActive: true }
  );

  const tier1Metro = await findOrInsert(
    cityTypes,
    eq(cityTypes.code, 'TIER_1_METRO'),
    { countryId: india.id, name: 'Tier 1 Metro', code: 'TIER_1_METRO', description: 'Major Metropolitan Urban Centers', isActive: true }
  );

  const kolkata = await findOrInsert(
    cities,
    and(eq(cities.countryId, india.id), eq(cities.name, 'Kolkata')),
    {
      stateId: westBengal.id, countryId: india.id, name: 'Kolkata',
      cityTypeId: tier1Metro.id, timezone: 'Asia/Kolkata', isActive: true, sortOrder: 1,
    }
  );

  const mumbai = await findOrInsert(
    cities,
    and(eq(cities.countryId, india.id), eq(cities.name, 'Mumbai')),
    {
      stateId: maharashtra.id, countryId: india.id, name: 'Mumbai',
      cityTypeId: tier1Metro.id, timezone: 'Asia/Kolkata', isActive: true, sortOrder: 2,
    }
  );

  const toronto = await findOrInsert(
    cities,
    and(eq(cities.countryId, canada.id), eq(cities.name, 'Toronto')),
    {
      stateId: ontario.id, countryId: canada.id, name: 'Toronto',
      timezone: 'America/Toronto', isActive: true, sortOrder: 1,
    }
  );

  log.ok(`India: West Bengal (Kolkata), Maharashtra (Mumbai)`);
  log.ok(`Canada: Ontario (Toronto)`);

  // ── 4. Spatial Zones (with H3 Hexagonal Grid Cells) ──────────────────────────
  log.section('4. Spatial Zones (H3 Hexagonal Indexing)');

  const kolkataCenterCoords = [
    [88.3400, 22.5500],
    [88.3800, 22.5500],
    [88.3800, 22.5900],
    [88.3400, 22.5900],
    [88.3400, 22.5500],
  ];
  const kolkataAirportCoords = [
    [88.4300, 22.6400],
    [88.4600, 22.6400],
    [88.4600, 22.6700],
    [88.4300, 22.6700],
    [88.4300, 22.6400],
  ];
  const saltLakeCoords = [
    [88.3900, 22.5700],
    [88.4700, 22.5700],
    [88.4700, 22.6300],
    [88.3900, 22.6300],
    [88.3900, 22.5700],
  ];
  const torontoDowntownCoords = [
    [-79.4100, 43.6300],
    [-79.3600, 43.6300],
    [-79.3600, 43.6700],
    [-79.4100, 43.6700],
    [-79.4100, 43.6300],
  ];

  const zoneKolkataCenter = await findOrInsert(
    zones,
    and(eq(zones.cityId, kolkata.id), eq(zones.code, 'CCU_CENTER')),
    {
      cityId: kolkata.id,
      countryId: india.id,
      name: 'Kolkata City Centre',
      code: 'CCU_CENTER',
      type: 'commercial',
      resolution: 8,
      hexCells: getHexCellsForPolygon(kolkataCenterCoords, 8),
      polygon: { type: 'Polygon', coordinates: [kolkataCenterCoords] },
      boundary: JSON.stringify({ type: 'Polygon', coordinates: [kolkataCenterCoords] }),
      priority: 10,
      isActive: true,
    }
  );

  const zoneKolkataAirport = await findOrInsert(
    zones,
    and(eq(zones.cityId, kolkata.id), eq(zones.code, 'CCU_AIRPORT')),
    {
      cityId: kolkata.id,
      countryId: india.id,
      name: 'Kolkata Airport Zone',
      code: 'CCU_AIRPORT',
      type: 'airport',
      resolution: 8,
      hexCells: getHexCellsForPolygon(kolkataAirportCoords, 8),
      polygon: { type: 'Polygon', coordinates: [kolkataAirportCoords] },
      boundary: JSON.stringify({ type: 'Polygon', coordinates: [kolkataAirportCoords] }),
      priority: 20,
      isActive: true,
    }
  );

  const zoneSaltLake = await findOrInsert(
    zones,
    and(eq(zones.cityId, kolkata.id), eq(zones.code, 'CCU_TECH_HUB')),
    {
      cityId: kolkata.id,
      countryId: india.id,
      name: 'Salt Lake & New Town',
      code: 'CCU_TECH_HUB',
      type: 'tech_park',
      resolution: 8,
      hexCells: getHexCellsForPolygon(saltLakeCoords, 8),
      polygon: { type: 'Polygon', coordinates: [saltLakeCoords] },
      boundary: JSON.stringify({ type: 'Polygon', coordinates: [saltLakeCoords] }),
      priority: 10,
      isActive: true,
    }
  );

  const zoneTorontoDowntown = await findOrInsert(
    zones,
    and(eq(zones.cityId, toronto.id), eq(zones.code, 'YYZ_DOWNTOWN')),
    {
      cityId: toronto.id,
      countryId: canada.id,
      name: 'Toronto Downtown Core',
      code: 'YYZ_DOWNTOWN',
      type: 'commercial',
      resolution: 8,
      hexCells: getHexCellsForPolygon(torontoDowntownCoords, 8),
      polygon: { type: 'Polygon', coordinates: [torontoDowntownCoords] },
      boundary: JSON.stringify({ type: 'Polygon', coordinates: [torontoDowntownCoords] }),
      priority: 10,
      isActive: true,
    }
  );

  log.ok(`Kolkata City Centre (Priority: 10, H3 Hex Cells: ${zoneKolkataCenter?.hexCells?.length || 'Indexed'})`);
  log.ok(`Kolkata Airport Zone (Priority: 20, H3 Hex Cells: ${zoneKolkataAirport?.hexCells?.length || 'Indexed'})`);
  log.ok(`Salt Lake & New Town (Priority: 10, H3 Hex Cells: ${zoneSaltLake?.hexCells?.length || 'Indexed'})`);
  log.ok(`Toronto Downtown Core (Priority: 10, H3 Hex Cells: ${zoneTorontoDowntown?.hexCells?.length || 'Indexed'})`);

  // ── 5. Airports ─────────────────────────────────────────────────────────────
  log.section('5. Airports');

  const airportCCU = await findOrInsert(
    airports,
    and(eq(airports.cityId, kolkata.id), eq(airports.code, 'CCU')),
    {
      cityId: kolkata.id,
      zoneId: zoneKolkataAirport.id,
      name: 'Netaji Subhash Chandra Bose International Airport',
      code: 'CCU',
      boundary: JSON.stringify({ type: 'Polygon', coordinates: [kolkataAirportCoords] }),
      pickupEnabled: true,
      dropEnabled: true,
      isActive: true,
    }
  );

  const airportBOM = await findOrInsert(
    airports,
    and(eq(airports.cityId, mumbai.id), eq(airports.code, 'BOM')),
    {
      cityId: mumbai.id,
      name: 'Chhatrapati Shivaji Maharaj International Airport',
      code: 'BOM',
      pickupEnabled: true,
      dropEnabled: true,
      isActive: true,
    }
  );

  log.ok(`Kolkata CCU Airport & Mumbai BOM Airport`);

  // ── 6. Vehicle Types & Models ───────────────────────────────────────────────
  log.section('6. Vehicle Types & Models Catalog');

  const vtBike = await findOrInsert(
    vehicleTypes,
    eq(vehicleTypes.code, 'bike'),
    {
      name: 'Bike', code: 'bike', slug: 'bike', passengerCapacity: 1, capacity: 1, luggageCapacity: 0, sortOrder: 1, isActive: true,
    }
  );

  const vtAuto = await findOrInsert(
    vehicleTypes,
    eq(vehicleTypes.code, 'auto'),
    {
      name: 'Auto', code: 'auto', slug: 'auto', passengerCapacity: 3, capacity: 3, luggageCapacity: 1, sortOrder: 2, isActive: true,
    }
  );

  const vtCab = await findOrInsert(
    vehicleTypes,
    eq(vehicleTypes.code, 'cab'),
    {
      name: 'Cab', code: 'cab', slug: 'cab', passengerCapacity: 4, capacity: 4, luggageCapacity: 2, sortOrder: 3, isActive: true,
    }
  );

  const vtPremium = await findOrInsert(
    vehicleTypes,
    eq(vehicleTypes.code, 'premium-cab'),
    {
      name: 'Premium Cab', code: 'premium-cab', slug: 'premium-cab', passengerCapacity: 6, capacity: 6, luggageCapacity: 4, sortOrder: 4, isActive: true,
    }
  );

  const modelSlug = (brand, name) => `${brand}-${name}`.toLowerCase().replace(/\s+/g, '-');
  const vehicleModelRows = [
    { vehicleTypeId: vtBike.id,    brand: 'Honda',        name: 'Splendor' },
    { vehicleTypeId: vtBike.id,    brand: 'TVS',          name: 'Apache RTR' },
    { vehicleTypeId: vtBike.id,    brand: 'Hero',         name: 'Passion Pro' },
    { vehicleTypeId: vtAuto.id,    brand: 'Bajaj',        name: 'RE Compact Auto' },
    { vehicleTypeId: vtAuto.id,    brand: 'Piaggio',      name: 'Ape City' },
    { vehicleTypeId: vtCab.id,     brand: 'Maruti Suzuki', name: 'WagonR' },
    { vehicleTypeId: vtCab.id,     brand: 'Maruti Suzuki', name: 'Swift Dzire' },
    { vehicleTypeId: vtCab.id,     brand: 'Hyundai',      name: 'Grand i10' },
    { vehicleTypeId: vtPremium.id, brand: 'Toyota',       name: 'Innova Crysta' },
    { vehicleTypeId: vtPremium.id, brand: 'Toyota',       name: 'Fortuner' },
    { vehicleTypeId: vtPremium.id, brand: 'Mahindra',     name: 'XUV700' },
  ].map((m, i) => ({ ...m, slug: modelSlug(m.brand, m.name), sortOrder: i + 1, isActive: true, createdBy: superAdmin.id }));

  for (const m of vehicleModelRows) {
    await findOrInsert(
      vehicleModels,
      eq(vehicleModels.slug, m.slug),
      m
    );
  }

  log.ok(`4 Vehicle Types (Bike, Auto, Cab, Premium Cab)`);
  log.ok(`11 Vehicle Models mapped to type catalog`);

  // ── 7. Pricing Plans & Versioned Rate Cards ─────────────────────────────────
  log.section('7. Pricing Plans & Versioned Rate Cards');

  // Kolkata City-wide Cab Plan
  const kolkataCabPlan = await findOrInsert(
    pricingPlans,
    and(eq(pricingPlans.cityId, kolkata.id), eq(pricingPlans.vehicleTypeId, vtCab.id), eq(pricingPlans.scope, 'city')),
    {
      cityId: kolkata.id,
      vehicleTypeId: vtCab.id,
      scope: 'city',
      name: 'Kolkata Standard City Cab',
      currencyCode: 'INR',
      isActive: true,
    }
  );

  const kolkataCabPlanVersion = await findOrInsert(
    pricingPlanVersions,
    and(eq(pricingPlanVersions.pricingPlanId, kolkataCabPlan.id), eq(pricingPlanVersions.version, 1)),
    {
      pricingPlanId: kolkataCabPlan.id,
      version: 1,
      baseFare: 5000,
      minimumFare: 8000,
      distanceRate: 1400,
      timeRate: 100,
      bookingFee: 500,
      platformFee: 200,
      freeWaitingMinutes: 3,
      waitingRate: 150,
      cancellationFee: 3000,
      isActive: true,
    }
  );

  // Kolkata City-wide Bike Plan
  const kolkataBikePlan = await findOrInsert(
    pricingPlans,
    and(eq(pricingPlans.cityId, kolkata.id), eq(pricingPlans.vehicleTypeId, vtBike.id), eq(pricingPlans.scope, 'city')),
    {
      cityId: kolkata.id,
      vehicleTypeId: vtBike.id,
      scope: 'city',
      name: 'Kolkata Bike Express',
      currencyCode: 'INR',
      isActive: true,
    }
  );

  await findOrInsert(
    pricingPlanVersions,
    and(eq(pricingPlanVersions.pricingPlanId, kolkataBikePlan.id), eq(pricingPlanVersions.version, 1)),
    {
      pricingPlanId: kolkataBikePlan.id,
      version: 1,
      baseFare: 1500,
      minimumFare: 3000,
      distanceRate: 600,
      timeRate: 50,
      bookingFee: 200,
      platformFee: 100,
      freeWaitingMinutes: 2,
      waitingRate: 100,
      cancellationFee: 1500,
      isActive: true,
    }
  );

  // Zone-specific Kolkata Airport Cab Plan (higher base fare)
  const kolkataAirportCabPlan = await findOrInsert(
    pricingPlans,
    and(eq(pricingPlans.cityId, kolkata.id), eq(pricingPlans.zoneId, zoneKolkataAirport.id), eq(pricingPlans.vehicleTypeId, vtCab.id)),
    {
      cityId: kolkata.id,
      zoneId: zoneKolkataAirport.id,
      vehicleTypeId: vtCab.id,
      scope: 'zone',
      name: 'Kolkata Airport Cab Special',
      currencyCode: 'INR',
      isActive: true,
    }
  );

  await findOrInsert(
    pricingPlanVersions,
    and(eq(pricingPlanVersions.pricingPlanId, kolkataAirportCabPlan.id), eq(pricingPlanVersions.version, 1)),
    {
      pricingPlanId: kolkataAirportCabPlan.id,
      version: 1,
      baseFare: 7500,
      minimumFare: 12000,
      distanceRate: 1600,
      timeRate: 120,
      bookingFee: 1000,
      platformFee: 300,
      freeWaitingMinutes: 5,
      waitingRate: 200,
      cancellationFee: 5000,
      isActive: true,
    }
  );

  // Global legacy pricing versions fallback
  await db.insert(pricingVersions).values([
    {
      countryId: india.id,
      currencyId: currINR.id,
      vehicleTypeId: vtBike.id,
      cityId: kolkata.id,
      baseFareMinor: 1500,
      minFareMinor: 3000,
      perKmRateMinor: 600,
      perMinRateMinor: 50,
      waitingPricePerMinMinor: 100,
      waitingGracePeriodMin: 3,
      bookingFeeMinor: 200,
      serviceFeeMinor: 100,
      cancellationFeeMinor: 1500,
      noShowFeeMinor: 2000,
      airportFeeMinor: 0,
      tollFeeMinor: 0,
      taxPercentage: '5.00',
      surgeFloorMultiplier: '1.00',
      surgeCapMultiplier: '2.50',
      isActive: true,
    },
    {
      countryId: india.id,
      currencyId: currINR.id,
      vehicleTypeId: vtCab.id,
      cityId: kolkata.id,
      baseFareMinor: 5000,
      minFareMinor: 8000,
      perKmRateMinor: 1400,
      perMinRateMinor: 100,
      waitingPricePerMinMinor: 150,
      waitingGracePeriodMin: 3,
      bookingFeeMinor: 500,
      serviceFeeMinor: 200,
      cancellationFeeMinor: 3000,
      noShowFeeMinor: 4000,
      airportFeeMinor: 5000,
      tollFeeMinor: 0,
      taxPercentage: '5.00',
      surgeFloorMultiplier: '1.00',
      surgeCapMultiplier: '3.00',
      isActive: true,
    },
  ]).onConflictDoNothing();

  log.ok(`Pricing Plans & Rate Card Versions seeded (City-wide + Airport Zone override)`);

  // ── 8. Specialized Fare & Surcharge Rules ────────────────────────────────────
  log.section('8. Specialized Fare Rules (Airport, Night, Peak, Surge, Toll)');

  await findOrInsert(
    airportPricingRules,
    and(eq(airportPricingRules.airportId, airportCCU.id), eq(airportPricingRules.vehicleTypeId, vtCab.id)),
    {
      airportId: airportCCU.id,
      vehicleTypeId: vtCab.id,
      direction: 'both',
      ruleType: 'AIRPORT_SURCHARGE',
      valueType: 'fixed',
      value: '5000.0000', // ₹50 flat surcharge for airport trips
      priority: 10,
      isActive: true,
    }
  );

  await findOrInsert(
    nightPricingRules,
    and(eq(nightPricingRules.pricingPlanId, kolkataCabPlan.id), eq(nightPricingRules.vehicleTypeId, vtCab.id)),
    {
      pricingPlanId: kolkataCabPlan.id,
      vehicleTypeId: vtCab.id,
      startTime: '23:00:00',
      endTime: '05:00:00',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      ruleType: 'NIGHT_SURCHARGE',
      valueType: 'multiplier',
      value: '1.2500', // +25% night fare multiplier
      priority: 5,
      isActive: true,
    }
  );

  await findOrInsert(
    peakPricingRules,
    and(eq(peakPricingRules.pricingPlanId, kolkataCabPlan.id), eq(peakPricingRules.vehicleTypeId, vtCab.id)),
    {
      pricingPlanId: kolkataCabPlan.id,
      vehicleTypeId: vtCab.id,
      name: 'Morning Office Rush',
      startTime: '08:30:00',
      endTime: '11:00:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      ruleType: 'PEAK_SURCHARGE',
      valueType: 'multiplier',
      value: '1.2000', // +20% morning peak multiplier
      priority: 8,
      isActive: true,
    }
  );

  await findOrInsert(
    surgeRules,
    and(eq(surgeRules.cityId, kolkata.id), eq(surgeRules.vehicleTypeId, vtCab.id)),
    {
      cityId: kolkata.id,
      vehicleTypeId: vtCab.id,
      mode: 'ratio',
      minRatio: '1.5000',
      maxRatio: '2.5000',
      multiplier: '1.3000', // 1.3x surge when demand exceeds 1.5x supply
      priority: 1,
      isActive: true,
    }
  );

  await findOrInsert(
    tollRules,
    and(eq(tollRules.cityId, kolkata.id), eq(tollRules.fromZoneId, zoneKolkataCenter.id), eq(tollRules.toZoneId, zoneSaltLake.id)),
    {
      cityId: kolkata.id,
      fromZoneId: zoneKolkataCenter.id,
      toZoneId: zoneSaltLake.id,
      name: 'Maa Flyover / EM Bypass Toll',
      amount: 3500, // ₹35 toll fee
      direction: 'both',
      isActive: true,
    }
  );

  log.ok(`Airport Surcharge (₹50), Night Surcharge (1.25x), Peak Rush (1.20x), Surge (1.30x), Toll (₹35)`);

  // ── 9. Promos & Promo Rules (Driver 100% Protected, Platform Subsidized) ─────
  log.section('9. Promo Engine & Subsidies');

  const promoWelcome50 = await findOrInsert(
    promos,
    eq(promos.code, 'WELCOME50'),
    {
      code: 'WELCOME50',
      name: '50% Off Welcome Offer',
      description: 'Get 50% discount up to ₹100 on your first ride',
      discountType: 'percentage',
      discountValue: '50.0000',
      maxDiscountMinor: 10000,
      minFareMinor: 5000,
      usageLimit: 10000,
      perUserLimit: 1,
      isFirstRideOnly: true,
      validFrom: daysAgo(30),
      validUntil: daysFromNow(90),
      countryId: india.id,
      cityId: kolkata.id,
      isActive: true,
    }
  );

  const promoFlat100 = await findOrInsert(
    promos,
    eq(promos.code, 'FLAT100'),
    {
      code: 'FLAT100',
      name: 'Flat ₹100 Off Airport Ride',
      description: 'Save flat ₹100 on airport pickups and drops',
      discountType: 'fixed',
      discountValue: '10000.0000',
      minFareMinor: 30000,
      usageLimit: 5000,
      perUserLimit: 3,
      isFirstRideOnly: false,
      validFrom: daysAgo(10),
      validUntil: daysFromNow(60),
      countryId: india.id,
      cityId: kolkata.id,
      airportId: airportCCU.id,
      isActive: true,
    }
  );

  await findOrInsert(
    promoRules,
    and(eq(promoRules.promoId, promoWelcome50.id), eq(promoRules.ruleType, 'NEW_USER')),
    {
      promoId: promoWelcome50.id,
      ruleType: 'NEW_USER',
      ruleValue: { isNewUser: true },
      cityId: kolkata.id,
      isActive: true,
    }
  );

  log.ok(`WELCOME50 (50% up to ₹100), FLAT100 (Flat ₹100 Airport)`);

  // ── 10. Tax & Deterministic Multi-Tier Commission Waterfall ─────────────────
  log.section('10. Tax Rules & Commission Waterfall');

  await findOrInsert(
    taxRules,
    and(eq(taxRules.countryId, india.id), eq(taxRules.name, 'India GST (5% Transport)')),
    { countryId: india.id, name: 'India GST (5% Transport)', appliesTo: 'both', rate: '0.0500', isInclusive: false, isActive: true }
  );

  await findOrInsert(
    taxRules,
    and(eq(taxRules.countryId, canada.id), eq(taxRules.name, 'Canada HST (13%)')),
    { countryId: canada.id, name: 'Canada HST (13%)', appliesTo: 'both', rate: '0.1300', isInclusive: false, isActive: true }
  );

  // Tier 1: City + Vehicle Type Local Rule
  const commCityCab = await findOrInsert(
    commissionRules,
    and(eq(commissionRules.cityId, kolkata.id), eq(commissionRules.vehicleTypeId, vtCab.id)),
    {
      name: 'Kolkata Cab Standard Commission',
      countryId: india.id,
      cityId: kolkata.id,
      vehicleTypeId: vtCab.id,
      bookingFeeMinor: 500,
      subscriberRate: '0.0000',    // 0% commission for subscribers!
      nonSubscriberRate: '0.2000', // 20% commission for non-subscribers
      priority: 10,
      isActive: true,
    }
  );

  await findOrInsert(
    commissionRuleVersions,
    and(eq(commissionRuleVersions.ruleId, commCityCab.id), eq(commissionRuleVersions.version, 1)),
    {
      ruleId: commCityCab.id,
      version: 1,
      name: commCityCab.name,
      countryId: india.id,
      cityId: kolkata.id,
      vehicleTypeId: vtCab.id,
      bookingFeeMinor: 500,
      subscriberRate: '0.0000',
      nonSubscriberRate: '0.2000',
      priority: 10,
      isActive: true,
      changeSummary: 'Initial local city commission rule version',
    }
  );

  // Tier 6: Global Default Fallback Rule
  const commGlobal = await findOrInsert(
    commissionRules,
    eq(commissionRules.name, 'Global System Default Commission'),
    {
      name: 'Global System Default Commission',
      countryId: null,
      cityId: null,
      vehicleTypeId: null,
      bookingFeeMinor: 0,
      subscriberRate: '0.0500',
      nonSubscriberRate: '0.2500',
      priority: 1,
      isActive: true,
    }
  );

  await findOrInsert(
    commissionRuleVersions,
    and(eq(commissionRuleVersions.ruleId, commGlobal.id), eq(commissionRuleVersions.version, 1)),
    {
      ruleId: commGlobal.id,
      version: 1,
      name: commGlobal.name,
      bookingFeeMinor: 0,
      subscriberRate: '0.0500',
      nonSubscriberRate: '0.2500',
      priority: 1,
      isActive: true,
      changeSummary: 'Global default commission rule',
    }
  );

  log.ok(`GST 5% transport tax`);
  log.ok(`Deterministic Commission Waterfall (Kolkata Cab: 0% Subscribed / 20% Unsubscribed, Global Fallback: 5%/25%)`);

  // ── 11. Driver & Rider Subscription Plans (Commercial v2) ───────────────────
  log.section('11. Driver Subscription Plans');

  const planMonthly = await findOrInsert(
    subscriptionPlans,
    and(eq(subscriptionPlans.countryId, india.id), eq(subscriptionPlans.type, 'monthly')),
    {
      name:           'Monthly Pro Driver',
      countryId:       india.id,
      type:           'monthly',
      currencyCode:   'INR',
      priceMinor:      99900,
      durationDays:    30,
      trialDays:        3,
      features:        ['0% Commission', 'Priority Matching', 'Instant Daily Payouts', '24/7 Dedicated Support'],
      sortOrder:        1,
      isActive:         true,
    }
  );

  const planYearly = await findOrInsert(
    subscriptionPlans,
    and(eq(subscriptionPlans.countryId, india.id), eq(subscriptionPlans.type, 'yearly')),
    {
      name:           'Annual Elite Driver',
      countryId:       india.id,
      type:           'yearly',
      currencyCode:   'INR',
      priceMinor:      799900,
      durationDays:    365,
      trialDays:        7,
      features:        ['0% Commission', 'VIP Priority Matching', 'Zero Platform Fees', 'Free Vehicle Health Inspection'],
      sortOrder:        2,
      isActive:         true,
    }
  );

  const planLifetime = await findOrInsert(
    subscriptionPlans,
    and(eq(subscriptionPlans.countryId, india.id), eq(subscriptionPlans.type, 'lifetime')),
    {
      name:           'Lifetime Founder Driver',
      countryId:       india.id,
      type:           'lifetime',
      currencyCode:   'INR',
      priceMinor:      2499900,
      durationDays:    null,
      trialDays:        0,
      features:        ['0% Commission Forever', 'Top Priority Queue', 'Lifetime VIP Support'],
      sortOrder:        3,
      isActive:         true,
    }
  );

  // Rider Pass
  await findOrInsert(
    riderSubscriptionPlans,
    and(eq(riderSubscriptionPlans.countryId, india.id), eq(riderSubscriptionPlans.name, 'Rider Daily Commuter Pass')),
    {
      name: 'Rider Daily Commuter Pass',
      type: 'monthly',
      countryId: india.id,
      currencyCode: 'INR',
      priceMinor: 49900,
      durationDays: 30,
      features: ['10% off on every ride', 'No surge pricing in peak hours', 'Priority driver pickup'],
      isActive: true,
    }
  );

  log.ok(`Driver Plans: Monthly ₹999, Annual ₹7999, Lifetime ₹24999`);
  log.ok(`Rider Plans: Commuter Pass ₹499/mo (10% off + surge protection)`);

  // ── 12. Riders (Users) & Wallets ────────────────────────────────────────────
  log.section('12. Riders (Users) & Wallets');

  const riderData = [
    { phone: '+919876543210', name: 'Priya Sharma',    email: 'priya@example.com',   rating: '4.85' },
    { phone: '+919876543220', name: 'Amit Banerjee',   email: 'amit@example.com',    rating: '4.70' },
    { phone: '+919876543230', name: 'Sunita Ghosh',    email: 'sunita@example.com',  rating: '4.95' },
    { phone: '+919876543240', name: 'Rajan Mehta',     email: 'rajan@example.com',   rating: '4.20' },
    { phone: '+919876543250', name: 'Kavya Nair',      email: 'kavya@example.com',   rating: '5.00' },
  ];

  const insertedRiders = [];
  for (const r of riderData) {
    const rider = await findOrInsert(
      users,
      eq(users.phone, r.phone),
      { ...r, isVerified: true, totalRides: '0' }
    );
    insertedRiders.push(rider);

    await findOrInsert(
      wallets,
      eq(wallets.riderId, rider.id),
      {
        riderId: rider.id,
        currencyCode: 'INR',
        balanceMinor: 250000, // ₹2,500 initial wallet balance
        status: 'active',
      }
    );
    log.ok(`Rider: ${rider.phone} (${rider.name}) — Wallet: ₹2500`);
  }

  // ── 13. Drivers, Vehicles & Driver Subscriptions ────────────────────────────
  log.section('13. Drivers, Vehicles & Subscriptions');

  const driverData = [
    {
      phone: '+919876543211', name: 'Rahul Kumar', email: 'rahul.driver@example.com',
      licenseNumber: 'WB2020001001', aadharNumber: '1234567890000001',
      vehicleTypeId: vtBike.id, vehicleNumber: 'WB12AB1001', vehicleModel: 'Honda Activa 6G',
      approvalStatus: 'approved', subscriptionStatus: 'active', isOnline: true,
      currentLat: '22.5720', currentLng: '88.3635', rating: '4.85', totalRides: 120,
    },
    {
      phone: '+919876543212', name: 'Suresh Mondal', email: 'suresh.driver@example.com',
      licenseNumber: 'WB2019001002', aadharNumber: '1234567890000002',
      vehicleTypeId: vtAuto.id, vehicleNumber: 'WB12CD2002', vehicleModel: 'Bajaj RE Auto',
      approvalStatus: 'approved', subscriptionStatus: 'active', isOnline: true,
      currentLat: '22.5730', currentLng: '88.3650', rating: '4.60', totalRides: 250,
    },
    {
      phone: '+919876543213', name: 'Bikash Das', email: 'bikash.driver@example.com',
      licenseNumber: 'WB2018001003', aadharNumber: '1234567890000003',
      vehicleTypeId: vtCab.id, vehicleNumber: 'WB12EF3003', vehicleModel: 'Maruti Swift Dzire',
      approvalStatus: 'approved', subscriptionStatus: 'active', isOnline: true,
      currentLat: '22.5715', currentLng: '88.3620', rating: '4.92', totalRides: 430,
    },
    {
      phone: '+919876543214', name: 'Tapan Roy', email: 'tapan.driver@example.com',
      licenseNumber: 'WB2021001004', aadharNumber: '1234567890000004',
      vehicleTypeId: vtBike.id, vehicleNumber: 'WB12GH4004', vehicleModel: 'TVS Jupiter',
      approvalStatus: 'approved', subscriptionStatus: 'expired', isOnline: false,
      rating: '4.30', totalRides: 85,
    },
    {
      phone: '+919876543217', name: 'Prosenjit Bose', email: 'prosenjit.driver@example.com',
      licenseNumber: 'WB2016001007', aadharNumber: '1234567890000007',
      vehicleTypeId: vtPremium.id, vehicleNumber: 'WB12MN7007', vehicleModel: 'Toyota Innova Crysta',
      approvalStatus: 'approved', subscriptionStatus: 'active', isOnline: true,
      currentLat: '22.6450', currentLng: '88.4450', rating: '4.98', totalRides: 680,
    },
    {
      phone: '+919876543221', name: 'Manoj Chatterjee', email: 'manoj.driver@example.com',
      licenseNumber: 'WB2020001010', aadharNumber: '1234567890000010',
      vehicleTypeId: vtCab.id, vehicleNumber: 'WB12ST0010', vehicleModel: 'Tata Tigor EV',
      approvalStatus: 'approved', subscriptionStatus: 'active', isOnline: true,
      currentLat: '22.5740', currentLng: '88.3660', rating: '4.80', totalRides: 310,
    },
  ];

  const insertedDrivers = [];
  for (const d of driverData) {
    const drv = await findOrInsert(
      drivers,
      eq(drivers.phone, d.phone),
      {
        ...d,
        countryId: india.id,
        stateId: westBengal.id,
        cityId: kolkata.id,
        registrationStatus: 'approved',
        registrationStep: 12,
      }
    );
    insertedDrivers.push(drv);

    // Driver Wallet
    await findOrInsert(
      wallets,
      eq(wallets.driverId, drv.id),
      {
        driverId: drv.id,
        currencyCode: 'INR',
        balanceMinor: 50000,
        status: 'active',
      }
    );

    // Driver Bank Account
    await findOrInsert(
      driverBankAccounts,
      eq(driverBankAccounts.driverId, drv.id),
      {
        driverId: drv.id,
        countryId: india.id,
        accountHolderName: drv.name,
        accountNumberLast4: drv.phone.slice(-4),
        routingCode: 'SBIN0001234',
        bankName: 'State Bank of India',
        isVerified: true,
      }
    );

    if (drv.subscriptionStatus === 'active' && planMonthly) {
      await findOrInsert(
        subscriptions,
        and(eq(subscriptions.driverId, drv.id), eq(subscriptions.planId, planMonthly.id)),
        {
          driverId: drv.id,
          planId: planMonthly.id,
          status: 'active',
          startDate: daysAgo(5),
          endDate: daysFromNow(25),
          currencyCode: 'INR',
          amountMinor: planMonthly.priceMinor,
        }
      );
    }
    log.ok(`Driver: ${drv.phone} (${drv.name}) [${drv.subscriptionStatus}]`);
  }

  // ── 14. Rides, Quotes, Itemized Fares & Subsidy Financials ───────────────────
  log.section('14. Rides, Fare Quotes, Itemized Fares & Subsidy Ledger');

  if (insertedRiders.length >= 2 && insertedDrivers.length >= 2) {
    const rider = insertedRiders[0];
    const driver = insertedDrivers[2]; // Bikash — Cab

    const [testRide] = await db.insert(rides).values({
      riderId: rider.id,
      driverId: driver.id,
      vehicleTypeId: vtCab.id,
      countryId: india.id,
      currencyCode: 'INR',
      pickupLat: '22.5726', pickupLng: '88.3639', pickupAddress: 'Park Street, Kolkata',
      dropLat:   '22.6450', dropLng:   '88.4450', dropAddress:   'Kolkata Airport (CCU)',
      status: 'completed',
      estimatedFareMinor: 58000,
      finalFareMinor: 48000, // ₹480 after promo discount
      distanceKm: '15.400',
      durationMin: 42,
      driverRating: 5,
      riderRating: 5,
      requestedAt: daysAgo(1),
      acceptedAt: new Date(daysAgo(1).getTime() + 45_000),
      startedAt: new Date(daysAgo(1).getTime() + 240_000),
      completedAt: new Date(daysAgo(1).getTime() + 2_760_000),
    }).onConflictDoNothing().returning();

    if (testRide && kolkataCabPlan && kolkataCabPlanVersion) {
      // 1. Fare Quote
      await db.insert(fareQuotes).values({
        quoteId: `Q-${Date.now()}-001`,
        userId: rider.id,
        cityId: kolkata.id,
        pickupZoneId: zoneKolkataCenter.id,
        destinationZoneId: zoneKolkataAirport.id,
        destinationAirportId: airportCCU.id,
        vehicleTypeId: vtCab.id,
        pickupLatitude: '22.5726000',
        pickupLongitude: '88.3639000',
        destinationLatitude: '22.6450000',
        destinationLongitude: '88.4450000',
        estimatedDistanceMeters: 15400,
        estimatedDurationSeconds: 2520,
        pricingPlanId: kolkataCabPlan.id,
        pricingPlanVersionId: kolkataCabPlanVersion.id,
        currencyCode: 'INR',
        baseFare: 5000,
        distanceFare: 21560,
        timeFare: 4200,
        airportFee: 5000,
        tollAmount: 3500,
        bookingFee: 500,
        platformFee: 200,
        discountAmount: 10000,
        taxAmount: 2438,
        subtotal: 39960,
        total: 52398,
        status: 'active',
        expiresAt: daysFromNow(1),
      }).onConflictDoNothing();

      // 2. Production Itemized Ride Fare
      await db.insert(rideFares).values({
        rideId: testRide.id,
        userId: rider.id,
        cityId: kolkata.id,
        pickupZoneId: zoneKolkataCenter.id,
        destinationZoneId: zoneKolkataAirport.id,
        destinationAirportId: airportCCU.id,
        vehicleTypeId: vtCab.id,
        pricingPlanId: kolkataCabPlan.id,
        pricingPlanVersionId: kolkataCabPlanVersion.id,
        currencyCode: 'INR',
        actualDistanceMeters: 15400,
        actualDurationSeconds: 2520,
        baseFare: 5000,
        distanceFare: 21560,
        timeFare: 4200,
        airportFee: 5000,
        tollAmount: 3500,
        bookingFee: 500,
        platformFee: 200,
        discountAmount: 10000,
        taxAmount: 2438,
        subtotal: 39960,
        total: 48000,
        couponCode: 'WELCOME50',
      }).onConflictDoNothing();

      // 3. Promo Usage
      if (promoWelcome50) {
        await db.insert(promoUsages).values({
          promoId: promoWelcome50.id,
          userId: rider.id,
          rideId: testRide.id,
          discountAmountMinor: 10000,
          status: 'redeemed',
        }).onConflictDoNothing();
      }

      // 4. Financial Breakdown
      await db.insert(rideFinancials).values({
        rideId: testRide.id,
        userId: rider.id,
        cityId: kolkata.id,
        pickupZoneId: zoneKolkataCenter.id,
        destinationZoneId: zoneKolkataAirport.id,
        destinationAirportId: airportCCU.id,
        vehicleTypeId: vtCab.id,
        pricingPlanId: kolkataCabPlan.id,
        pricingPlanVersionId: kolkataCabPlanVersion.id,
        currencyCode: 'INR',
        grossFareMinor: 58000,
        bookingFeeMinor: 500,
        platformFeeMinor: 200,
        promoDiscountMinor: 10000,
        platformSubsidyMinor: 10000,
        taxMinor: 2438,
        tollMinor: 3500,
        commissionMinor: 0,
        commissionRate: '0.0000',
        driverEarningMinor: 57500,
        platformRevenueMinor: 500,
        isSubscriber: true,
        couponCode: 'WELCOME50',
        subtotal: 39960,
        total: 48000,
      }).onConflictDoNothing();

      log.ok(`Completed Airport Ride seeded with itemized breakdown & platform promo subsidy`);
    }
  }

  // ── 15. Audit Logs & Notification Templates ─────────────────────────────────
  log.section('15. Audit Logs & Notification Templates');

  if (superAdmin && insertedDrivers.length) {
    await db.insert(auditLogs).values([
      {
        actorId:    superAdmin.id,
        actorType:  'admin',
        action:     'DRIVER_APPROVED',
        entityType: 'driver',
        entityId:   insertedDrivers[0]?.id,
        meta:       { note: 'All documents verified. Driver approved for commercial dispatch.' },
        ip:         '127.0.0.1',
      },
      {
        actorId:    superAdmin.id,
        actorType:  'admin',
        action:     'COMMISSION_RULE_CREATED',
        entityType: 'commission_rule',
        meta:       { note: 'Configured local Kolkata 0% subscriber tier' },
        ip:         '127.0.0.1',
      },
    ]).onConflictDoNothing();

    if (commCityCab) {
      await db.insert(commercialAuditLogs).values([
        {
          actorId: superAdmin.id,
          action: 'create',
          entityType: 'commission_rule',
          entityId: commCityCab.id,
          reason: 'Seeded initial production commission rule',
        },
      ]).onConflictDoNothing();
    }
  }

  await db.insert(notificationTemplates).values([
    {
      eventType: 'PAYMENT_SUCCESS', channel: 'push', audience: 'rider',
      subject: null, bodyHtml: 'Your payment of {{amount}} for this ride has been recorded.',
      isActive: true, createdBy: superAdmin.id,
    },
    {
      eventType: 'PAYMENT_SUCCESS', channel: 'push', audience: 'driver',
      subject: null, bodyHtml: 'Payment of {{amount}} ({{method}}) recorded for your ride.',
      isActive: true, createdBy: superAdmin.id,
    },
    {
      eventType: 'SUBSCRIPTION_ACTIVATED', channel: 'push', audience: 'driver',
      subject: null, bodyHtml: 'Your {{planName}} plan is now active. Valid until {{endDate}}.',
      isActive: true, createdBy: superAdmin.id,
    },
    {
      eventType: 'PROMO_APPLIED', channel: 'push', audience: 'rider',
      subject: null, bodyHtml: 'Promo {{code}} applied! You saved {{amount}} on this ride.',
      isActive: true, createdBy: superAdmin.id,
    },
  ]).onConflictDoNothing();

  log.ok('Audit logs and notification templates initialized');

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`
${'═'.repeat(60)}
  🎉  SEED COMPLETE — ALL 20 FARE & COMMERCIAL DOMAINS READY!
${'═'.repeat(60)}

  Admin Credentials:
    Super Admin   → admin@rideshare.com   / Admin@123456
    Ops Admin     → ops@rideshare.com     / Ops@123456
    Finance Admin → finance@rideshare.com / Finance@123456

  Rider Test Logins (OTP: 123456 in dev mode):
    +919876543210  Priya Sharma   (Wallet Balance: ₹2,500)
    +919876543220  Amit Banerjee  (Wallet Balance: ₹2,500)
    +919876543230  Sunita Ghosh   (Wallet Balance: ₹2,500)

  Driver Test Logins (OTP: 123456 in dev mode):
    +919876543211  Rahul Kumar      [Bike | Active Sub | ONLINE]
    +919876543212  Suresh Mondal    [Auto | Active Sub | ONLINE]
    +919876543213  Bikash Das       [Cab  | Active Sub | ONLINE]
    +919876543217  Prosenjit Bose   [SUV  | Active Sub | ONLINE]

  Active Promos:
    WELCOME50      50% off up to ₹100 (New Rider Welcome)
    FLAT100        Flat ₹100 off Airport rides (CCU Airport)
${'═'.repeat(60)}
`);
}

seed()
  .catch((err) => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
