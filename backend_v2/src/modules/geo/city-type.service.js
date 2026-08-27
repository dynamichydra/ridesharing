import { eq, asc, count, ilike, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { cityTypes } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

/**
 * Standard default tiers to seed if table is empty
 */
export const DEFAULT_CITY_TYPES = [
  {
    code: 'TIER_1_METRO',
    name: 'Tier-1 Metro / Expensive City',
    description: 'Dense metropolitan capitals & global hubs (e.g. New York, Mumbai, London, Tokyo)',
    costIndex: '1.40',
    densityLevel: 'high',
    defaultSurgeCap: '3.50',
    waitingFeeEnabled: true,
    sortOrder: 1,
  },
  {
    code: 'TIER_2_URBAN',
    name: 'Tier-2 Emerging Urban City',
    description: 'Major regional economic centers & tech cities (e.g. Austin, Pune, Lyon, Manchester)',
    costIndex: '1.00',
    densityLevel: 'medium',
    defaultSurgeCap: '3.00',
    waitingFeeEnabled: true,
    sortOrder: 2,
  },
  {
    code: 'TIER_3_REGIONAL',
    name: 'Tier-3 Town / Semi-Urban',
    description: 'Smaller regional towns & suburban clusters with moderate density',
    costIndex: '0.80',
    densityLevel: 'low',
    defaultSurgeCap: '2.00',
    waitingFeeEnabled: true,
    sortOrder: 3,
  },
  {
    code: 'TOURIST_HUB',
    name: 'Tourist & Vacation Destination',
    description: 'Resort towns, island markets & seasonal tourist hot-spots (e.g. Goa, Aspen, Cancun)',
    costIndex: '1.60',
    densityLevel: 'medium',
    defaultSurgeCap: '4.00',
    waitingFeeEnabled: true,
    sortOrder: 4,
  },
  {
    code: 'RURAL',
    name: 'Rural & Low-Density Territory',
    description: 'Expansive rural territories requiring wide driver candidate discovery',
    costIndex: '0.70',
    densityLevel: 'rural',
    defaultSurgeCap: '1.50',
    waitingFeeEnabled: false,
    sortOrder: 5,
  },
];

export async function listCityTypes(onlyActive = true) {
  const where = onlyActive ? eq(cityTypes.isActive, true) : undefined;
  return db.select().from(cityTypes).where(where).orderBy(asc(cityTypes.sortOrder));
}

export async function listCityTypesPaginated(page, limit, offset, search = null) {
  const conditions = [];
  if (search) {
    conditions.push(ilike(cityTypes.name, `%${search}%`));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(cityTypes).where(where);
  const rows = await db.select().from(cityTypes).where(where)
    .orderBy(asc(cityTypes.sortOrder), asc(cityTypes.name))
    .limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function getCityTypeById(id) {
  const [row] = await db.select().from(cityTypes).where(eq(cityTypes.id, id)).limit(1);
  if (!row) throw { statusCode: 404, message: 'City type not found' };
  return row;
}

export async function getCityTypeByCode(code) {
  const [row] = await db.select().from(cityTypes).where(eq(cityTypes.code, code)).limit(1);
  return row || null;
}

export async function createCityType(data) {
  const [row] = await db.insert(cityTypes).values(data).returning();
  return row;
}

export async function updateCityType(id, data) {
  data.updatedAt = new Date();
  const [row] = await db.update(cityTypes).set(data).where(eq(cityTypes.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'City type not found' };
  return row;
}

export async function setCityTypeActive(id, isActive) {
  const [row] = await db.update(cityTypes).set({ isActive, updatedAt: new Date() })
    .where(eq(cityTypes.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'City type not found' };
  return row;
}

export async function seedDefaultCityTypesIfEmpty() {
  const [{ total }] = await db.select({ total: count() }).from(cityTypes);
  if (total === 0) {
    const inserted = await db.insert(cityTypes).values(DEFAULT_CITY_TYPES).returning();
    return inserted;
  }
  return [];
}
