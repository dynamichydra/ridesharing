import { eq, and, isNull, or, count, desc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { fareRules, vehicleTypes, zones } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

export async function listRules(page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(fareRules);
  const rows = await db
    .select({
      rule: fareRules,
      vehicleType: vehicleTypes,
      zone: zones,
    })
    .from(fareRules)
    .leftJoin(vehicleTypes, eq(fareRules.vehicleTypeId, vehicleTypes.id))
    .leftJoin(zones, eq(fareRules.zoneId, zones.id))
    .orderBy(desc(fareRules.priority), desc(fareRules.createdAt))
    .limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function getById(id) {
  const [row] = await db
    .select({ rule: fareRules, vehicleType: vehicleTypes, zone: zones })
    .from(fareRules)
    .leftJoin(vehicleTypes, eq(fareRules.vehicleTypeId, vehicleTypes.id))
    .leftJoin(zones, eq(fareRules.zoneId, zones.id))
    .where(eq(fareRules.id, id)).limit(1);
  if (!row) throw { statusCode: 404, message: 'Fare rule not found' };
  return row;
}

export async function create(data) {
  const [rule] = await db.insert(fareRules).values(data).returning();
  return rule;
}

export async function update(id, data) {
  data.updatedAt = new Date();
  const [rule] = await db.update(fareRules).set(data).where(eq(fareRules.id, id)).returning();
  if (!rule) throw { statusCode: 404, message: 'Fare rule not found' };
  return rule;
}

export async function remove(id) {
  const [rule] = await db.update(fareRules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(fareRules.id, id)).returning();
  if (!rule) throw { statusCode: 404, message: 'Fare rule not found' };
  return { deleted: true };
}

/**
 * Load all active rules applicable to a given vehicleTypeId.
 * Includes rules with no vehicleTypeId (applies to all types).
 */
export async function getActiveRulesForVehicle(vehicleTypeId) {
  return db.select().from(fareRules).where(
    and(
      eq(fareRules.isActive, true),
      or(eq(fareRules.vehicleTypeId, vehicleTypeId), isNull(fareRules.vehicleTypeId)),
    ),
  ).orderBy(desc(fareRules.priority));
}
