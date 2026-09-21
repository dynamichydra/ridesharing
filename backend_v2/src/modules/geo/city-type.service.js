import { eq, asc, desc, count, ilike, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { cityTypes, cityTypeFares, vehicleTypes } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

/**
 * Standard default tiers to seed if table is empty
 */
export const DEFAULT_CITY_TYPES = [
  {
    code: 'TIER_1_METRO',
    name: 'Tier-1 Metro / Expensive City',
    description: 'Dense metropolitan capitals & global hubs (e.g. New York, Mumbai, London, Tokyo, Delhi)',
    densityLevel: 'high',
    defaultSurgeCap: '3.50',
    waitingFeeEnabled: true,
    sortOrder: 1,
  },
  {
    code: 'TIER_2_URBAN',
    name: 'Tier-2 Emerging Urban City',
    description: 'Major regional economic centers & tech cities (e.g. Austin, Pune, Lyon, Manchester, Kolkata)',
    densityLevel: 'medium',
    defaultSurgeCap: '3.00',
    waitingFeeEnabled: true,
    sortOrder: 2,
  },
  {
    code: 'TIER_3_REGIONAL',
    name: 'Tier-3 Town / Semi-Urban',
    description: 'Smaller regional towns & suburban clusters with moderate density',
    densityLevel: 'low',
    defaultSurgeCap: '2.00',
    waitingFeeEnabled: true,
    sortOrder: 3,
  },
  {
    code: 'TOURIST_HUB',
    name: 'Tourist & Vacation Destination',
    description: 'Resort towns, island markets & seasonal tourist hot-spots (e.g. Goa, Aspen, Cancun)',
    densityLevel: 'medium',
    defaultSurgeCap: '4.00',
    waitingFeeEnabled: true,
    sortOrder: 4,
  },
  {
    code: 'RURAL',
    name: 'Rural & Low-Density Territory',
    description: 'Expansive rural territories requiring wide driver candidate discovery',
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

// ── City-Type Vehicle Fare & Commission Rates ────────────────────────────────

export async function listCityTypeFares(cityTypeId) {
  const rows = await db
    .select({
      id: cityTypeFares.id,
      cityTypeId: cityTypeFares.cityTypeId,
      vehicleTypeId: cityTypeFares.vehicleTypeId,
      vehicleTypeName: vehicleTypes.name,
      vehicleTypeSlug: vehicleTypes.slug,
      vehicleTypeCapacity: vehicleTypes.capacity,
      baseFareMinor: cityTypeFares.baseFareMinor,
      minFareMinor: cityTypeFares.minFareMinor,
      perKmRateMinor: cityTypeFares.perKmRateMinor,
      perMinRateMinor: cityTypeFares.perMinRateMinor,
      waitingPricePerMinMinor: cityTypeFares.waitingPricePerMinMinor,
      waitingGracePeriodMin: cityTypeFares.waitingGracePeriodMin,
      bookingFeeMinor: cityTypeFares.bookingFeeMinor,
      serviceFeeMinor: cityTypeFares.serviceFeeMinor,
      cancellationFeeMinor: cityTypeFares.cancellationFeeMinor,
      noShowFeeMinor: cityTypeFares.noShowFeeMinor,
      surgeFloorMultiplier: cityTypeFares.surgeFloorMultiplier,
      surgeCapMultiplier: cityTypeFares.surgeCapMultiplier,
      nonSubscriberCommissionRate: cityTypeFares.nonSubscriberCommissionRate,
      subscriberCommissionRate: cityTypeFares.subscriberCommissionRate,
      platformFeeMinor: cityTypeFares.platformFeeMinor,
      minCommissionMinor: cityTypeFares.minCommissionMinor,
      maxCommissionMinor: cityTypeFares.maxCommissionMinor,
      isActive: cityTypeFares.isActive,
      createdAt: cityTypeFares.createdAt,
      updatedAt: cityTypeFares.updatedAt,
    })
    .from(cityTypeFares)
    .leftJoin(vehicleTypes, eq(cityTypeFares.vehicleTypeId, vehicleTypes.id))
    .where(eq(cityTypeFares.cityTypeId, cityTypeId))
    .orderBy(desc(cityTypeFares.isActive), desc(cityTypeFares.createdAt));

  // Map clean aliases to avoid any NaN issues on client
  return rows.map((r) => {
    const commissionPct = r.nonSubscriberCommissionRate != null
      ? (Number(r.nonSubscriberCommissionRate) * 100).toFixed(2)
      : '20.00';

    return {
      ...r,
      costPerKmMinor: r.perKmRateMinor ?? 0,
      costPerMinMinor: r.perMinRateMinor ?? 0,
      waitingCostPerMinMinor: r.waitingPricePerMinMinor ?? 0,
      freeWaitingMinutes: r.waitingGracePeriodMin ?? 3,
      commissionPercentage: commissionPct,
      flatCommissionMinor: r.platformFeeMinor ?? 0,
    };
  });
}

/**
 * Creates a new version of Fare Rates for a vehicle type within a City Tier.
 * Deactivates any previous versions for that (cityTypeId, vehicleTypeId).
 */
export async function createCityTypeFare(cityTypeId, data) {
  const vehicleTypeId = data.vehicleTypeId;
  if (!vehicleTypeId) throw { statusCode: 400, message: 'vehicleTypeId is required' };

  // Parse mapped aliases
  const perKmRateMinor = data.perKmRateMinor ?? data.costPerKmMinor ?? 0;
  const perMinRateMinor = data.perMinRateMinor ?? data.costPerMinMinor ?? 0;
  const waitingPricePerMinMinor = data.waitingPricePerMinMinor ?? data.waitingCostPerMinMinor ?? 0;
  const waitingGracePeriodMin = data.waitingGracePeriodMin ?? data.freeWaitingMinutes ?? 3;
  const platformFeeMinor = data.platformFeeMinor ?? data.flatCommissionMinor ?? 0;

  let nonSubscriberCommissionRate = data.nonSubscriberCommissionRate;
  if (nonSubscriberCommissionRate === undefined && data.commissionPercentage !== undefined) {
    nonSubscriberCommissionRate = (Number(data.commissionPercentage) / 100).toFixed(4);
  }

  // 1. Deactivate all existing versions for this vehicle type in this city tier
  await db.update(cityTypeFares)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(
      eq(cityTypeFares.cityTypeId, cityTypeId),
      eq(cityTypeFares.vehicleTypeId, vehicleTypeId)
    ));

  // 2. Insert new active version
  const [created] = await db.insert(cityTypeFares)
    .values({
      cityTypeId,
      vehicleTypeId,
      baseFareMinor: data.baseFareMinor ?? 0,
      minFareMinor: data.minFareMinor ?? 0,
      perKmRateMinor,
      perMinRateMinor,
      waitingPricePerMinMinor,
      waitingGracePeriodMin,
      bookingFeeMinor: data.bookingFeeMinor ?? 0,
      serviceFeeMinor: data.serviceFeeMinor ?? 0,
      cancellationFeeMinor: data.cancellationFeeMinor ?? 0,
      noShowFeeMinor: data.noShowFeeMinor ?? 0,
      surgeFloorMultiplier: data.surgeFloorMultiplier ? String(data.surgeFloorMultiplier) : '1.00',
      surgeCapMultiplier: data.surgeCapMultiplier ? String(data.surgeCapMultiplier) : '3.00',
      nonSubscriberCommissionRate: nonSubscriberCommissionRate ? String(nonSubscriberCommissionRate) : '0.2000',
      subscriberCommissionRate: data.subscriberCommissionRate ? String(data.subscriberCommissionRate) : '0.0500',
      platformFeeMinor,
      minCommissionMinor: data.minCommissionMinor ?? 0,
      maxCommissionMinor: data.maxCommissionMinor ?? null,
      isActive: true,
    })
    .returning();

  return created;
}

export async function upsertCityTypeFare(cityTypeId, vehicleTypeId, data) {
  return createCityTypeFare(cityTypeId, { ...data, vehicleTypeId });
}

/**
 * Activates a specific historical fare version and deactivates all other versions for the same vehicle type.
 */
export async function activateCityTypeFare(fareId) {
  const [target] = await db.select().from(cityTypeFares).where(eq(cityTypeFares.id, fareId)).limit(1);
  if (!target) throw { statusCode: 404, message: 'City type fare not found' };

  // Deactivate other versions of the same vehicle in this city tier
  await db.update(cityTypeFares)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(
      eq(cityTypeFares.cityTypeId, target.cityTypeId),
      eq(cityTypeFares.vehicleTypeId, target.vehicleTypeId)
    ));

  // Activate target
  const [activated] = await db.update(cityTypeFares)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(cityTypeFares.id, fareId))
    .returning();

  return activated;
}

export async function deleteCityTypeFare(id) {
  const [deleted] = await db.delete(cityTypeFares)
    .where(eq(cityTypeFares.id, id))
    .returning();
  if (!deleted) throw { statusCode: 404, message: 'City type fare not found' };
  return deleted;
}

export async function seedDefaultCityTypesIfEmpty() {
  const [{ total }] = await db.select({ total: count() }).from(cityTypes);
  if (total === 0) {
    const inserted = await db.insert(cityTypes).values(DEFAULT_CITY_TYPES).returning();
    return inserted;
  }
  return [];
}
