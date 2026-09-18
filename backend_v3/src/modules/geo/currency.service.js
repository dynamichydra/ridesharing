import { eq, and, asc, count, ilike, or } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { currencies } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

export async function listCurrencies(onlyActive = true) {
  const where = onlyActive ? eq(currencies.isActive, true) : undefined;
  return db.select().from(currencies).where(where).orderBy(asc(currencies.code));
}

export async function listCurrenciesPaginated(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.isActive !== undefined) conditions.push(eq(currencies.isActive, filters.isActive));
  if (filters.search) {
    conditions.push(
      or(
        ilike(currencies.code, `%${filters.search}%`),
        ilike(currencies.name, `%${filters.search}%`),
        ilike(currencies.symbol, `%${filters.search}%`)
      )
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(currencies).where(where);
  const rows = await db
    .select()
    .from(currencies)
    .where(where)
    .orderBy(asc(currencies.code))
    .limit(limit)
    .offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function getCurrencyById(id) {
  const [row] = await db.select().from(currencies).where(eq(currencies.id, id)).limit(1);
  if (!row) throw { statusCode: 404, message: 'Currency not found' };
  return row;
}

export async function getCurrencyByCode(code) {
  const [row] = await db.select().from(currencies).where(eq(currencies.code, code.toUpperCase())).limit(1);
  return row || null;
}

export async function createCurrency(data) {
  const code = data.code.toUpperCase().trim();
  const existing = await getCurrencyByCode(code);
  if (existing) throw { statusCode: 409, message: `Currency with code ${code} already exists` };

  const [row] = await db.insert(currencies).values({
    ...data,
    code,
    minorUnitExponent: data.minorUnitExponent !== undefined ? Number(data.minorUnitExponent) : 2,
  }).returning();

  return row;
}

export async function updateCurrency(id, data) {
  data.updatedAt = new Date();
  if (data.code) data.code = data.code.toUpperCase().trim();
  if (data.minorUnitExponent !== undefined) data.minorUnitExponent = Number(data.minorUnitExponent);

  const [row] = await db.update(currencies).set(data).where(eq(currencies.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Currency not found' };
  return row;
}

export async function setCurrencyActive(id, isActive) {
  const [row] = await db.update(currencies).set({ isActive, updatedAt: new Date() })
    .where(eq(currencies.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Currency not found' };
  return row;
}

export async function seedDefaultCurrencies() {
  const defaults = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', minorUnitExponent: 2 },
    { code: 'USD', name: 'United States Dollar', symbol: '$', minorUnitExponent: 2 },
    { code: 'EUR', name: 'Euro', symbol: '€', minorUnitExponent: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', minorUnitExponent: 2 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', minorUnitExponent: 2 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', minorUnitExponent: 2 },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', minorUnitExponent: 2 },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', minorUnitExponent: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', minorUnitExponent: 0 },
    { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', minorUnitExponent: 3 },
  ];

  const seeded = [];
  for (const item of defaults) {
    const existing = await getCurrencyByCode(item.code);
    if (!existing) {
      const [inserted] = await db.insert(currencies).values(item).returning();
      seeded.push(inserted);
    }
  }
  return seeded;
}
