import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { fxRates, fxQuotes, currencies } from '../../../drizzle/schema/index.js';

// Default static rates for fallback
const STATIC_FX_RATES = {
  'USD_INR': 83.5,
  'INR_USD': 0.012,
  'CAD_INR': 61.2,
  'INR_CAD': 0.016,
  'EUR_INR': 90.0,
  'INR_EUR': 0.011,
  'USD_CAD': 1.36,
  'CAD_USD': 0.74,
};

export async function getFxRate(baseCurrency, quoteCurrency) {
  if (baseCurrency === quoteCurrency) return 1.0;

  const [rateRow] = await db.select().from(fxRates)
    .where(and(eq(fxRates.baseCurrency, baseCurrency), eq(fxRates.quoteCurrency, quoteCurrency)))
    .orderBy(desc(fxRates.effectiveDate))
    .limit(1);

  if (rateRow) return rateRow.rate;

  const key = `${baseCurrency}_${quoteCurrency}`;
  return STATIC_FX_RATES[key] || 1.0;
}

/**
 * Creates a guaranteed locked FX quote valid for a specific duration (e.g. 15 minutes) for a ride/payment.
 */
export async function createFxQuote(baseCurrency, quoteCurrency, validityMinutes = 15) {
  const rate = await getFxRate(baseCurrency, quoteCurrency);
  const now = new Date();
  const validUntil = new Date(now.getTime() + validityMinutes * 60 * 1000);

  const [quote] = await db.insert(fxQuotes).values({
    baseCurrency,
    quoteCurrency,
    rate,
    validFrom: now,
    validUntil,
  }).returning();

  return quote;
}

/**
 * Convert minor units from base currency to quote currency using quote rate.
 */
export function convertMoneyWithRate(amountMinor, rate, baseExponent = 2, quoteExponent = 2) {
  const majorBase = amountMinor / (10 ** baseExponent);
  const majorQuote = majorBase * rate;
  return Math.round(majorQuote * (10 ** quoteExponent));
}
