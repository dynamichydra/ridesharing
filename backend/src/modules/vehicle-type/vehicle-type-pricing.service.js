import { eq, and, isNull, lte, or, gt, desc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { vehicleTypePricing, countries } from '../../../drizzle/schema/index.js';
import { metrics } from '../../utils/metrics.js';
import { pickResolvedTier } from './rate-card-resolution.js';

export async function listForCountry(countryId) {
  return db.select().from(vehicleTypePricing)
    .where(and(eq(vehicleTypePricing.countryId, countryId), eq(vehicleTypePricing.isActive, true)));
}

/**
 * Rate-card resolution with a documented, explicit fallback order — used by
 * calculateFare() and by dispute/audit recalculation (via `atDate`):
 *   1. Exact match: vehicleType + country + fuelType, active at `atDate`.
 *   2. Category fallback: vehicleType + country, fuelType IS NULL, active at `atDate`.
 *   3. Global default: the deployment's default country (countries.isDefault),
 *      same vehicleType, fuelType IS NULL, active at `atDate`.
 * `atDate` defaults to now, but a disputed historical trip can pass its
 * `requestedAt` timestamp to recalculate with the rate card that was actually
 * active then — not whatever the card has since been changed to.
 */
export async function resolveRateCard(vehicleTypeId, countryId, fuelType = null, atDate = new Date()) {
  const activeAt = (row) => and(
    lte(row.effectiveFrom, atDate),
    or(isNull(row.effectiveTo), gt(row.effectiveTo, atDate)),
  );

  let exact = null;
  if (fuelType) {
    [exact] = await db.select().from(vehicleTypePricing).where(and(
      eq(vehicleTypePricing.vehicleTypeId, vehicleTypeId),
      eq(vehicleTypePricing.countryId, countryId),
      eq(vehicleTypePricing.fuelType, fuelType),
      eq(vehicleTypePricing.isActive, true),
      activeAt(vehicleTypePricing),
    )).orderBy(desc(vehicleTypePricing.version)).limit(1);
  }

  const [category] = await db.select().from(vehicleTypePricing).where(and(
    eq(vehicleTypePricing.vehicleTypeId, vehicleTypeId),
    eq(vehicleTypePricing.countryId, countryId),
    isNull(vehicleTypePricing.fuelType),
    eq(vehicleTypePricing.isActive, true),
    activeAt(vehicleTypePricing),
  )).orderBy(desc(vehicleTypePricing.version)).limit(1);

  let global = null;
  const [defaultCountry] = await db.select().from(countries).where(eq(countries.isDefault, true)).limit(1);
  if (defaultCountry && defaultCountry.id !== countryId) {
    [global] = await db.select().from(vehicleTypePricing).where(and(
      eq(vehicleTypePricing.vehicleTypeId, vehicleTypeId),
      eq(vehicleTypePricing.countryId, defaultCountry.id),
      isNull(vehicleTypePricing.fuelType),
      eq(vehicleTypePricing.isActive, true),
      activeAt(vehicleTypePricing),
    )).orderBy(desc(vehicleTypePricing.version)).limit(1);
  }

  const resolved = pickResolvedTier(fuelType, { exact, category, global });
  if (!resolved) {
    throw { statusCode: 404, message: 'This vehicle type has no rate card (exact, category, or global default)' };
  }
  metrics.rateCardResolutionTotal.inc({ tier: resolved.resolutionTier });
  return resolved;
}

/** Back-compat convenience wrapper — "current" rate card, category-level (no fuelType). */
export async function getRate(vehicleTypeId, countryId) {
  return resolveRateCard(vehicleTypeId, countryId, null);
}

/**
 * Admin write — never mutates a rate card in place. Marks the current active
 * row (for this vehicleType+country+fuelType) as superseded (effectiveTo=now,
 * isActive=false) and inserts a new row at version+1. This is what makes
 * historical recalculation via resolveRateCard(..., atDate) correct — the old
 * row's numbers stay intact for any ride that was quoted against it.
 */
export async function upsertRate(vehicleTypeId, countryId, data) {
  const fuelType = data.fuelType ?? null;

  const [existing] = await db.select().from(vehicleTypePricing).where(and(
    eq(vehicleTypePricing.vehicleTypeId, vehicleTypeId),
    eq(vehicleTypePricing.countryId, countryId),
    fuelType ? eq(vehicleTypePricing.fuelType, fuelType) : isNull(vehicleTypePricing.fuelType),
    eq(vehicleTypePricing.isActive, true),
  )).orderBy(desc(vehicleTypePricing.version)).limit(1);

  const now = new Date();
  if (existing) {
    await db.update(vehicleTypePricing)
      .set({ isActive: false, effectiveTo: now, updatedAt: now })
      .where(eq(vehicleTypePricing.id, existing.id));
  }

  const [row] = await db.insert(vehicleTypePricing).values({
    ...data,
    vehicleTypeId, countryId, fuelType,
    version: (existing?.version ?? 0) + 1,
    effectiveFrom: now,
    isActive: true,
  }).returning();
  return row;
}
