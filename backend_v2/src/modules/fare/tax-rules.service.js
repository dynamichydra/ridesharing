import { eq, and, or, isNull, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { taxRules } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

export async function listPaginated(page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(taxRules);
  const rows = await db.select().from(taxRules).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function create(data) {
  const [row] = await db.insert(taxRules).values(data).returning();
  return row;
}

export async function update(id, data) {
  data.updatedAt = new Date();
  const [row] = await db.update(taxRules).set(data).where(eq(taxRules.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Tax rule not found' };
  return row;
}

export async function remove(id) {
  const [row] = await db.update(taxRules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(taxRules.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Tax rule not found' };
  return { deleted: true };
}

/**
 * Country-wide active tax rules for a given purpose ('fare' or 'subscription').
 * State-level rules (stateId set) are stored for future use but not resolved here yet —
 * pickup points only resolve to a country today, not a state/province.
 */
export async function getApplicableTaxRules(countryId, appliesTo) {
  return db.select().from(taxRules).where(and(
    eq(taxRules.countryId, countryId),
    eq(taxRules.isActive, true),
    isNull(taxRules.stateId),
    or(eq(taxRules.appliesTo, appliesTo), eq(taxRules.appliesTo, 'both')),
  ));
}
