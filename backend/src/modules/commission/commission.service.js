import { eq, and, isNull, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { commissionRules, vehicleTypes, countries } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

/**
 * Commission-rule resolution — same exact -> category -> global fallback tier as
 * vehicle-type-pricing.service.js's resolveRateCard:
 *   1. Exact match: vehicleTypeId + countryId, active.
 *   2. Country default: countryId set, vehicleTypeId IS NULL, active.
 *   3. Global default: both IS NULL, active.
 * Highest `priority` wins within a tier if more than one row matches (rare — mainly for
 * staged rollouts of a rate change).
 */
export async function resolveCommissionRule(vehicleTypeId, countryId) {
  const [exact] = await db.select().from(commissionRules).where(and(
    eq(commissionRules.vehicleTypeId, vehicleTypeId),
    eq(commissionRules.countryId, countryId),
    eq(commissionRules.isActive, true),
  )).orderBy(desc(commissionRules.priority)).limit(1);
  if (exact) return { ...exact, resolutionTier: 'exact' };

  if (countryId) {
    const [countryDefault] = await db.select().from(commissionRules).where(and(
      isNull(commissionRules.vehicleTypeId),
      eq(commissionRules.countryId, countryId),
      eq(commissionRules.isActive, true),
    )).orderBy(desc(commissionRules.priority)).limit(1);
    if (countryDefault) return { ...countryDefault, resolutionTier: 'country' };
  }

  const [global] = await db.select().from(commissionRules).where(and(
    isNull(commissionRules.vehicleTypeId),
    isNull(commissionRules.countryId),
    eq(commissionRules.isActive, true),
  )).orderBy(desc(commissionRules.priority)).limit(1);
  if (global) return { ...global, resolutionTier: 'global' };

  throw { statusCode: 422, message: 'No commission rule is configured (not even a global default) — an admin must create one' };
}

// Booking fee comes off the top untouched by the rate, then the rate applies to the
// remainder — same structure as the Uber-style breakdown the rate table is modeled on.
export function computeCommission({ finalFareMinor, rule, isSubscriber }) {
  const bookingFeeMinor = Math.min(rule.bookingFeeMinor, finalFareMinor);
  const rate = parseFloat(isSubscriber ? rule.subscriberRate : rule.nonSubscriberRate);
  const commissionMinor = bookingFeeMinor + Math.round((finalFareMinor - bookingFeeMinor) * rate);
  const driverEarningsMinor = finalFareMinor - commissionMinor;
  return { bookingFeeMinor, rate, commissionMinor, driverEarningsMinor };
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

export async function listRules(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.isActive !== undefined) conditions.push(eq(commissionRules.isActive, filters.isActive));
  if (filters.countryId) conditions.push(eq(commissionRules.countryId, filters.countryId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(commissionRules).where(where);
  const rows = await db
    .select({ rule: commissionRules, vehicleType: vehicleTypes, country: countries })
    .from(commissionRules)
    .leftJoin(vehicleTypes, eq(commissionRules.vehicleTypeId, vehicleTypes.id))
    .leftJoin(countries, eq(commissionRules.countryId, countries.id))
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
