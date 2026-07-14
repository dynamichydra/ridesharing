import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { vehicleTypePricing } from '../../../drizzle/schema/index.js';

export async function listForCountry(countryId) {
  return db.select().from(vehicleTypePricing)
    .where(and(eq(vehicleTypePricing.countryId, countryId), eq(vehicleTypePricing.isActive, true)));
}

export async function getRate(vehicleTypeId, countryId) {
  const [row] = await db.select().from(vehicleTypePricing).where(and(
    eq(vehicleTypePricing.vehicleTypeId, vehicleTypeId),
    eq(vehicleTypePricing.countryId, countryId),
    eq(vehicleTypePricing.isActive, true),
  )).limit(1);
  if (!row) throw { statusCode: 404, message: 'This vehicle type is not available in this country' };
  return row;
}

/** Admin upsert — one rate card per (vehicleTypeId, countryId). */
export async function upsertRate(vehicleTypeId, countryId, data) {
  const [existing] = await db.select().from(vehicleTypePricing).where(and(
    eq(vehicleTypePricing.vehicleTypeId, vehicleTypeId),
    eq(vehicleTypePricing.countryId, countryId),
  )).limit(1);

  if (existing) {
    const [row] = await db.update(vehicleTypePricing)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vehicleTypePricing.id, existing.id)).returning();
    return row;
  }
  const [row] = await db.insert(vehicleTypePricing)
    .values({ ...data, vehicleTypeId, countryId }).returning();
  return row;
}
