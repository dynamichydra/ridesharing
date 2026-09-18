import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { fxRates, fxQuotes } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { paginate } from '../../utils/response.js';

const FX_CACHE_TTL_SECONDS = 3600; // 1 hour in-memory cache

/**
 * Retrieves the current exchange rate between two currencies.
 * 
 * Order of resolution:
 * 1. Identity rate: base === quote -> 1.0
 * 2. Redis cache lookup: fx:rate:{base}:{quote}
 * 3. PostgreSQL database lookup for direct pair (baseCurrency -> quoteCurrency)
 * 4. PostgreSQL database lookup for inverse pair (quoteCurrency -> baseCurrency)
 * 5. If missing, throws a 422 UNSUPPORTED_FX_PAIR error.
 * 
 * @param {string} baseCurrency - e.g. 'USD'
 * @param {string} quoteCurrency - e.g. 'INR'
 * @returns {Promise<number>} - exchange rate multiplier
 */
export async function getFxRate(baseCurrency, quoteCurrency) {
  if (!baseCurrency || !quoteCurrency) {
    throw { statusCode: 400, message: 'baseCurrency and quoteCurrency are required' };
  }

  const base = baseCurrency.toUpperCase();
  const quote = quoteCurrency.toUpperCase();

  if (base === quote) return 1.0;

  // 1. Check Redis cache
  try {
    const cached = await redis.get(REDIS_KEYS.fxRate(base, quote));
    if (cached) {
      const rate = parseFloat(cached);
      if (!isNaN(rate) && rate > 0) return rate;
    }
  } catch (err) {
    // Non-fatal cache lookup error — fall through to DB
    console.warn('[FX] Redis cache read error:', err.message);
  }

  // 2. Direct database query
  const [direct] = await db.select().from(fxRates)
    .where(and(eq(fxRates.baseCurrency, base), eq(fxRates.quoteCurrency, quote)))
    .orderBy(desc(fxRates.effectiveDate))
    .limit(1);

  if (direct && direct.rate > 0) {
    const rate = parseFloat(direct.rate);
    redis.setex(REDIS_KEYS.fxRate(base, quote), FX_CACHE_TTL_SECONDS, String(rate)).catch(() => {});
    return rate;
  }

  // 3. Inverse database query (e.g. if we have USD -> INR = 83.5, then INR -> USD = 1 / 83.5)
  const [inverse] = await db.select().from(fxRates)
    .where(and(eq(fxRates.baseCurrency, quote), eq(fxRates.quoteCurrency, base)))
    .orderBy(desc(fxRates.effectiveDate))
    .limit(1);

  if (inverse && inverse.rate > 0) {
    const rate = 1.0 / parseFloat(inverse.rate);
    redis.setex(REDIS_KEYS.fxRate(base, quote), FX_CACHE_TTL_SECONDS, String(rate)).catch(() => {});
    return rate;
  }

  // 4. Safe failure rejection — never use arbitrary hardcoded values in financial operations
  throw {
    statusCode: 422,
    code: 'UNSUPPORTED_FX_PAIR',
    message: `No active exchange rate found for currency pair ${base}/${quote}`,
  };
}

/**
 * Sets or updates an active exchange rate in the database and updates cache.
 * 
 * @param {string} baseCurrency
 * @param {string} quoteCurrency
 * @param {number} rate
 * @param {string} [provider='admin']
 * @returns {Promise<object>}
 */
export async function setFxRate(baseCurrency, quoteCurrency, rate, provider = 'admin') {
  if (!rate || rate <= 0) {
    throw { statusCode: 400, message: 'Rate must be a positive number' };
  }

  const base = baseCurrency.toUpperCase();
  const quote = quoteCurrency.toUpperCase();
  const now = new Date();

  const [row] = await db.insert(fxRates).values({
    baseCurrency: base,
    quoteCurrency: quote,
    rate,
    provider,
    effectiveDate: now,
  }).returning();

  // Invalidate cache for direct and inverse keys
  try {
    await redis.setex(REDIS_KEYS.fxRate(base, quote), FX_CACHE_TTL_SECONDS, String(rate));
    await redis.setex(REDIS_KEYS.fxRate(quote, base), FX_CACHE_TTL_SECONDS, String(1.0 / rate));
  } catch (err) {
    console.warn('[FX] Redis cache write error:', err.message);
  }

  return row;
}

/**
 * Lists all FX rates with optional filters and pagination for Admin Portal.
 */
export async function listFxRates({ page = 1, limit = 20, offset = 0, baseCurrency, quoteCurrency } = {}) {
  const conditions = [];
  if (baseCurrency) conditions.push(eq(fxRates.baseCurrency, baseCurrency.toUpperCase()));
  if (quoteCurrency) conditions.push(eq(fxRates.quoteCurrency, quoteCurrency.toUpperCase()));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db.select({ total: count() }).from(fxRates).where(whereClause);
  const total = countResult?.total || 0;
  const rows = await db.select().from(fxRates)
    .where(whereClause)
    .orderBy(desc(fxRates.effectiveDate))
    .limit(limit)
    .offset(offset);

  return {
    rows,
    pagination: paginate(page, limit, total),
  };
}

/**
 * Deletes an FX rate record by ID and invalidates cache.
 */
export async function deleteFxRate(id) {
  const [deleted] = await db.delete(fxRates).where(eq(fxRates.id, id)).returning();
  if (!deleted) throw { statusCode: 404, message: 'FX Rate record not found' };

  try {
    await redis.del(REDIS_KEYS.fxRate(deleted.baseCurrency, deleted.quoteCurrency));
    await redis.del(REDIS_KEYS.fxRate(deleted.quoteCurrency, deleted.baseCurrency));
  } catch (err) {
    console.warn('[FX] Redis cache delete error:', err.message);
  }

  return deleted;
}

/**
 * Creates a guaranteed locked FX quote valid for a specific duration (e.g. 15 minutes) for a ride/payment.
 */
export async function createFxQuote(baseCurrency, quoteCurrency, validityMinutes = 15) {
  const rate = await getFxRate(baseCurrency, quoteCurrency);
  const now = new Date();
  const validUntil = new Date(now.getTime() + validityMinutes * 60 * 1000);

  const [quote] = await db.insert(fxQuotes).values({
    baseCurrency: baseCurrency.toUpperCase(),
    quoteCurrency: quoteCurrency.toUpperCase(),
    rate,
    validFrom: now,
    validUntil,
  }).returning();

  return quote;
}

/**
 * Convert minor units from base currency to quote currency using quote rate.
 * Handles currencies with different decimal exponents safely.
 */
export function convertMoneyWithRate(amountMinor, rate, baseExponent = 2, quoteExponent = 2) {
  const majorBase = amountMinor / (10 ** baseExponent);
  const majorQuote = majorBase * rate;
  return Math.round(majorQuote * (10 ** quoteExponent));
}
