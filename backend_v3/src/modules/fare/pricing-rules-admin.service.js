import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  airports,
  airportPricingRules,
  nightPricingRules,
  peakPricingRules,
  surgeRules,
  tollRules,
  cities,
  zones,
  vehicleTypes,
  pricingPlans,
} from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

// ─── Airports ─────────────────────────────────────────────────────────────────

export async function listAirports(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.cityId) conditions.push(eq(airports.cityId, filters.cityId));
  if (filters.isActive !== undefined) conditions.push(eq(airports.isActive, filters.isActive));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(airports).where(where);
  const rows = await db
    .select({ airport: airports, city: cities, zone: zones })
    .from(airports)
    .leftJoin(cities, eq(airports.cityId, cities.id))
    .leftJoin(zones, eq(airports.zoneId, zones.id))
    .where(where)
    .orderBy(desc(airports.createdAt))
    .limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function createAirport(data) {
  const [ap] = await db.insert(airports).values(data).returning();
  return ap;
}

export async function updateAirport(id, data) {
  data.updatedAt = new Date();
  const [ap] = await db.update(airports).set(data).where(eq(airports.id, id)).returning();
  if (!ap) throw { statusCode: 404, message: 'Airport not found' };
  return ap;
}

// ─── Airport Pricing Rules ───────────────────────────────────────────────────

export async function listAirportRules(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.airportId) conditions.push(eq(airportPricingRules.airportId, filters.airportId));
  if (filters.isActive !== undefined) conditions.push(eq(airportPricingRules.isActive, filters.isActive));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(airportPricingRules).where(where);
  const rows = await db
    .select({ rule: airportPricingRules, airport: airports, vehicleType: vehicleTypes })
    .from(airportPricingRules)
    .leftJoin(airports, eq(airportPricingRules.airportId, airports.id))
    .leftJoin(vehicleTypes, eq(airportPricingRules.vehicleTypeId, vehicleTypes.id))
    .where(where)
    .orderBy(desc(airportPricingRules.createdAt))
    .limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function createAirportRule(data) {
  const [rule] = await db.insert(airportPricingRules).values(data).returning();
  return rule;
}

// ─── Night Pricing Rules ─────────────────────────────────────────────────────

export async function listNightRules(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.pricingPlanId) conditions.push(eq(nightPricingRules.pricingPlanId, filters.pricingPlanId));
  if (filters.isActive !== undefined) conditions.push(eq(nightPricingRules.isActive, filters.isActive));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(nightPricingRules).where(where);
  const rows = await db
    .select({ rule: nightPricingRules, plan: pricingPlans, vehicleType: vehicleTypes })
    .from(nightPricingRules)
    .leftJoin(pricingPlans, eq(nightPricingRules.pricingPlanId, pricingPlans.id))
    .leftJoin(vehicleTypes, eq(nightPricingRules.vehicleTypeId, vehicleTypes.id))
    .where(where)
    .orderBy(desc(nightPricingRules.createdAt))
    .limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function createNightRule(data) {
  const [rule] = await db.insert(nightPricingRules).values(data).returning();
  return rule;
}

// ─── Peak Pricing Rules ──────────────────────────────────────────────────────

export async function listPeakRules(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.pricingPlanId) conditions.push(eq(peakPricingRules.pricingPlanId, filters.pricingPlanId));
  if (filters.isActive !== undefined) conditions.push(eq(peakPricingRules.isActive, filters.isActive));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(peakPricingRules).where(where);
  const rows = await db
    .select({ rule: peakPricingRules, plan: pricingPlans, vehicleType: vehicleTypes })
    .from(peakPricingRules)
    .leftJoin(pricingPlans, eq(peakPricingRules.pricingPlanId, pricingPlans.id))
    .leftJoin(vehicleTypes, eq(peakPricingRules.vehicleTypeId, vehicleTypes.id))
    .where(where)
    .orderBy(desc(peakPricingRules.createdAt))
    .limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function createPeakRule(data) {
  const [rule] = await db.insert(peakPricingRules).values(data).returning();
  return rule;
}

// ─── Surge Rules ─────────────────────────────────────────────────────────────

export async function listSurgeRules(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.cityId) conditions.push(eq(surgeRules.cityId, filters.cityId));
  if (filters.isActive !== undefined) conditions.push(eq(surgeRules.isActive, filters.isActive));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(surgeRules).where(where);
  const rows = await db
    .select({ rule: surgeRules, city: cities, zone: zones, vehicleType: vehicleTypes })
    .from(surgeRules)
    .leftJoin(cities, eq(surgeRules.cityId, cities.id))
    .leftJoin(zones, eq(surgeRules.zoneId, zones.id))
    .leftJoin(vehicleTypes, eq(surgeRules.vehicleTypeId, vehicleTypes.id))
    .where(where)
    .orderBy(desc(surgeRules.createdAt))
    .limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function createSurgeRule(data) {
  const [rule] = await db.insert(surgeRules).values(data).returning();
  return rule;
}

// ─── Toll Rules ──────────────────────────────────────────────────────────────

export async function listTollRules(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.cityId) conditions.push(eq(tollRules.cityId, filters.cityId));
  if (filters.isActive !== undefined) conditions.push(eq(tollRules.isActive, filters.isActive));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(tollRules).where(where);
  const rows = await db
    .select({ rule: tollRules, city: cities })
    .from(tollRules)
    .leftJoin(cities, eq(tollRules.cityId, cities.id))
    .where(where)
    .orderBy(desc(tollRules.createdAt))
    .limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function createTollRule(data) {
  const [rule] = await db.insert(tollRules).values(data).returning();
  return rule;
}
