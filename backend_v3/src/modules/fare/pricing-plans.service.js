import { eq, and, desc, count, inArray } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  pricingPlans,
  pricingPlanVersions,
  cities,
  zones,
  vehicleTypes,
} from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

export async function listPricingPlans(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.cityId) conditions.push(eq(pricingPlans.cityId, filters.cityId));
  if (filters.zoneId) conditions.push(eq(pricingPlans.zoneId, filters.zoneId));
  if (filters.vehicleTypeId) conditions.push(eq(pricingPlans.vehicleTypeId, filters.vehicleTypeId));
  if (filters.isActive !== undefined) conditions.push(eq(pricingPlans.isActive, filters.isActive));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(pricingPlans).where(where);
  const rawRows = await db
    .select({
      plan:        pricingPlans,
      city:        cities,
      zone:        zones,
      vehicleType: vehicleTypes,
    })
    .from(pricingPlans)
    .leftJoin(cities, eq(pricingPlans.cityId, cities.id))
    .leftJoin(zones, eq(pricingPlans.zoneId, zones.id))
    .leftJoin(vehicleTypes, eq(pricingPlans.vehicleTypeId, vehicleTypes.id))
    .where(where)
    .orderBy(desc(pricingPlans.createdAt))
    .limit(limit).offset(offset);

  const planIds = rawRows.map((r) => r.plan.id);
  const versionsByPlanId = {};
  if (planIds.length > 0) {
    const allVersions = await db
      .select()
      .from(pricingPlanVersions)
      .where(inArray(pricingPlanVersions.pricingPlanId, planIds))
      .orderBy(desc(pricingPlanVersions.version));

    for (const v of allVersions) {
      if (!versionsByPlanId[v.pricingPlanId]) {
        versionsByPlanId[v.pricingPlanId] = [];
      }
      versionsByPlanId[v.pricingPlanId].push(v);
    }
  }

  const rows = rawRows.map((r) => {
    const versions = versionsByPlanId[r.plan.id] || [];
    const activeVersion = versions.find((v) => v.isActive) || versions[0] || null;
    return {
      ...r,
      activeVersion,
      versions,
      versionCount: versions.length,
    };
  });

  return { rows, pagination: paginate(page, limit, total) };
}

export async function getPricingPlanById(id) {
  const [plan] = await db.select().from(pricingPlans).where(eq(pricingPlans.id, id)).limit(1);
  if (!plan) throw { statusCode: 404, message: 'Pricing plan not found' };

  const versions = await db.select().from(pricingPlanVersions)
    .where(eq(pricingPlanVersions.pricingPlanId, id))
    .orderBy(desc(pricingPlanVersions.version));

  return { ...plan, versions };
}

export async function createPricingPlan(data) {
  const [plan] = await db.insert(pricingPlans).values({
    cityId: data.cityId,
    zoneId: data.zoneId || null,
    vehicleTypeId: data.vehicleTypeId,
    scope: data.scope || (data.zoneId ? 'zone' : 'city'),
    name: data.name,
    currencyCode: data.currencyCode || 'INR',
    isActive: data.isActive !== undefined ? data.isActive : true,
  }).returning();

  // Create initial version if version data is provided
  if (data.initialVersion) {
    const v = data.initialVersion;
    const [version] = await db.insert(pricingPlanVersions).values({
      pricingPlanId: plan.id,
      version: 1,
      baseFare: v.baseFare || 0,
      minimumFare: v.minimumFare || 0,
      distanceRate: v.distanceRate || 0,
      timeRate: v.timeRate || 0,
      bookingFee: v.bookingFee || 0,
      platformFee: v.platformFee || 0,
      freeWaitingMinutes: v.freeWaitingMinutes || 0,
      waitingRate: v.waitingRate || 0,
      cancellationFee: v.cancellationFee || 0,
      effectiveFrom: v.effectiveFrom ? new Date(v.effectiveFrom) : new Date(),
      effectiveTo: v.effectiveTo ? new Date(v.effectiveTo) : null,
      isActive: true,
    }).returning();
    return { ...plan, version };
  }

  return plan;
}

export async function updatePricingPlan(id, data) {
  data.updatedAt = new Date();
  const [plan] = await db.update(pricingPlans).set(data).where(eq(pricingPlans.id, id)).returning();
  if (!plan) throw { statusCode: 404, message: 'Pricing plan not found' };
  return plan;
}

export async function createPricingPlanVersion(planId, data) {
  const [latest] = await db.select({ version: pricingPlanVersions.version })
    .from(pricingPlanVersions)
    .where(eq(pricingPlanVersions.pricingPlanId, planId))
    .orderBy(desc(pricingPlanVersions.version))
    .limit(1);

  const nextVersion = (latest?.version || 0) + 1;

  const [version] = await db.insert(pricingPlanVersions).values({
    pricingPlanId: planId,
    version: nextVersion,
    baseFare: data.baseFare,
    minimumFare: data.minimumFare,
    distanceRate: data.distanceRate,
    timeRate: data.timeRate,
    bookingFee: data.bookingFee || 0,
    platformFee: data.platformFee || 0,
    freeWaitingMinutes: data.freeWaitingMinutes || 0,
    waitingRate: data.waitingRate || 0,
    cancellationFee: data.cancellationFee || 0,
    effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(),
    effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
    isActive: data.isActive !== undefined ? data.isActive : true,
  }).returning();

  return version;
}

export async function updatePricingPlanVersion(planId, versionId, data) {
  const [version] = await db.update(pricingPlanVersions).set(data)
    .where(and(eq(pricingPlanVersions.pricingPlanId, planId), eq(pricingPlanVersions.id, versionId)))
    .returning();
  if (!version) throw { statusCode: 404, message: 'Pricing plan version not found' };
  return version;
}

