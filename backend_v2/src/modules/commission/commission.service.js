import { eq, and, isNull, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { commissionRules, vehicleTypes, countries, cities } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

/**
 * Commission-rule resolution — 5-tier waterfall specificity:
 *   1. City + Vehicle Type (Exact local)
 *   2. City Default (cityId set, vehicleTypeId IS NULL)
 *   3. Country + Vehicle Type (cityId IS NULL)
 *   4. Country Default (cityId IS NULL, vehicleTypeId IS NULL)
 *   5. Global Default (all IS NULL)
 * Highest `priority` wins within a tier if more than one row matches.
 */
export async function resolveCommissionRule(paramsOrVehicleTypeId, countryIdParam, cityIdParam) {
  let vehicleTypeId = null;
  let countryId = null;
  let cityId = null;

  if (paramsOrVehicleTypeId && typeof paramsOrVehicleTypeId === 'object') {
    vehicleTypeId = paramsOrVehicleTypeId.vehicleTypeId || null;
    countryId = paramsOrVehicleTypeId.countryId || null;
    cityId = paramsOrVehicleTypeId.cityId || null;
  } else {
    vehicleTypeId = paramsOrVehicleTypeId || null;
    countryId = countryIdParam || null;
    cityId = cityIdParam || null;
  }

  // 1. Tier 1: City + Vehicle Type (Exact local)
  if (cityId && vehicleTypeId) {
    const [exactCityVehicle] = await db.select().from(commissionRules).where(and(
      eq(commissionRules.cityId, cityId),
      eq(commissionRules.vehicleTypeId, vehicleTypeId),
      eq(commissionRules.isActive, true),
    )).orderBy(desc(commissionRules.priority), desc(commissionRules.createdAt)).limit(1);
    if (exactCityVehicle) return { ...exactCityVehicle, resolutionTier: 'city_vehicle' };
  }

  // 2. Tier 2: City Default (cityId set, vehicleTypeId IS NULL)
  if (cityId) {
    const [cityDefault] = await db.select().from(commissionRules).where(and(
      eq(commissionRules.cityId, cityId),
      isNull(commissionRules.vehicleTypeId),
      eq(commissionRules.isActive, true),
    )).orderBy(desc(commissionRules.priority), desc(commissionRules.createdAt)).limit(1);
    if (cityDefault) return { ...cityDefault, resolutionTier: 'city_default' };
  }

  // 3. Tier 3: Country + Vehicle Type (cityId IS NULL)
  if (countryId && vehicleTypeId) {
    const [countryVehicle] = await db.select().from(commissionRules).where(and(
      isNull(commissionRules.cityId),
      eq(commissionRules.countryId, countryId),
      eq(commissionRules.vehicleTypeId, vehicleTypeId),
      eq(commissionRules.isActive, true),
    )).orderBy(desc(commissionRules.priority), desc(commissionRules.createdAt)).limit(1);
    if (countryVehicle) return { ...countryVehicle, resolutionTier: 'country_vehicle' };
  }

  // 4. Tier 4: Country Default (both cityId & vehicleTypeId are null)
  if (countryId) {
    const [countryDefault] = await db.select().from(commissionRules).where(and(
      isNull(commissionRules.cityId),
      isNull(commissionRules.vehicleTypeId),
      eq(commissionRules.countryId, countryId),
      eq(commissionRules.isActive, true),
    )).orderBy(desc(commissionRules.priority), desc(commissionRules.createdAt)).limit(1);
    if (countryDefault) return { ...countryDefault, resolutionTier: 'country_default' };
  }

  // 5. Tier 5: Global Default (cityId, countryId, and vehicleTypeId all null)
  const [global] = await db.select().from(commissionRules).where(and(
    isNull(commissionRules.cityId),
    isNull(commissionRules.countryId),
    isNull(commissionRules.vehicleTypeId),
    eq(commissionRules.isActive, true),
  )).orderBy(desc(commissionRules.priority), desc(commissionRules.createdAt)).limit(1);
  if (global) return { ...global, resolutionTier: 'global' };

  throw { statusCode: 422, message: 'No commission rule is configured (not even a global default) — an admin must create one' };
}

// Booking fee comes off the top untouched by the rate, then the rate applies to the remainder.
// Also supports minCommissionMinor (floor) and maxCommissionMinor (ceiling cap).
export function computeCommission({ finalFareMinor, rule, isSubscriber }) {
  const fare = Math.max(0, finalFareMinor || 0);
  const bookingFeeMinor = Math.min(rule.bookingFeeMinor || 0, fare);
  const rate = parseFloat(isSubscriber ? rule.subscriberRate : rule.nonSubscriberRate) || 0;

  // Base variable commission on fare remainder
  const remainder = Math.max(0, fare - bookingFeeMinor);
  let commissionMinor = bookingFeeMinor + Math.round(remainder * rate);

  // Apply floor limit (minimum platform commission cut)
  const minFloor = Number(rule.minCommissionMinor) || 0;
  if (minFloor > 0 && commissionMinor < minFloor) {
    commissionMinor = minFloor;
  }

  // Apply ceiling limit (maximum platform commission cap)
  const maxCap = rule.maxCommissionMinor != null && rule.maxCommissionMinor !== '' ? Number(rule.maxCommissionMinor) : null;
  if (maxCap != null && maxCap > 0 && commissionMinor > maxCap) {
    commissionMinor = maxCap;
  }

  // Platform cut cannot exceed the total fare
  commissionMinor = Math.min(commissionMinor, fare);
  const driverEarningsMinor = Math.max(0, fare - commissionMinor);

  return {
    bookingFeeMinor,
    rate,
    commissionMinor,
    driverEarningsMinor,
    minCommissionMinor: minFloor,
    maxCommissionMinor: maxCap,
    resolutionTier: rule.resolutionTier || null,
  };
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

export async function listRules(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.isActive !== undefined) conditions.push(eq(commissionRules.isActive, filters.isActive));
  if (filters.countryId) conditions.push(eq(commissionRules.countryId, filters.countryId));
  if (filters.cityId) conditions.push(eq(commissionRules.cityId, filters.cityId));
  if (filters.vehicleTypeId) conditions.push(eq(commissionRules.vehicleTypeId, filters.vehicleTypeId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(commissionRules).where(where);
  const rows = await db
    .select({
      rule: commissionRules,
      vehicleType: vehicleTypes,
      country: countries,
      city: cities,
    })
    .from(commissionRules)
    .leftJoin(vehicleTypes, eq(commissionRules.vehicleTypeId, vehicleTypes.id))
    .leftJoin(countries, eq(commissionRules.countryId, countries.id))
    .leftJoin(cities, eq(commissionRules.cityId, cities.id))
    .where(where)
    .orderBy(desc(commissionRules.priority), desc(commissionRules.createdAt))
    .limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function getById(id) {
  const [rule] = await db.select().from(commissionRules).where(eq(commissionRules.id, id)).limit(1);
  if (!rule) throw { statusCode: 404, message: 'Commission rule not found' };
  return rule;
}

export async function create(data) {
  const [rule] = await db.insert(commissionRules).values(data).returning();
  return rule;
}

export async function update(id, data) {
  data.updatedAt = new Date();
  const [rule] = await db.update(commissionRules).set(data).where(eq(commissionRules.id, id)).returning();
  if (!rule) throw { statusCode: 404, message: 'Commission rule not found' };
  return rule;
}

// No hard-delete — commission rules are configuration, not master data, but rides settled
// under an old rule still reference it (ride.fareSnapshot.commission.ruleId), so disabling
// (like fare-rules.js's setActive) rather than deleting keeps that history resolvable.
export async function setActive(id, isActive, adminId) {
  const [rule] = await db.update(commissionRules)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(commissionRules.id, id)).returning();
  if (!rule) throw { statusCode: 404, message: 'Commission rule not found' };
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: isActive ? 'COMMISSION_RULE_ENABLED' : 'COMMISSION_RULE_DISABLED',
    entityType: 'commission_rule', entityId: id,
  });
  return rule;
}

