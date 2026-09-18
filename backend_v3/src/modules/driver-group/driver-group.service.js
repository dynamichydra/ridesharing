import { eq, and, desc, count, sql, inArray } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { driverGroups, driverGroupMembers, drivers, countries } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

// ── Driver Groups CRUD ────────────────────────────────────────────────────────

export async function createGroup({ countryId, name, code, description, isActive = true }) {
  if (!name || !code) {
    throw { statusCode: 400, message: 'name and code are required' };
  }

  const cleanCode = String(code).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

  const [existing] = await db.select({ id: driverGroups.id })
    .from(driverGroups)
    .where(eq(driverGroups.code, cleanCode))
    .limit(1);

  if (existing) {
    throw { statusCode: 409, message: `Driver group with code '${cleanCode}' already exists` };
  }

  if (countryId) {
    const [c] = await db.select({ id: countries.id }).from(countries).where(eq(countries.id, countryId)).limit(1);
    if (!c) throw { statusCode: 404, message: 'Country not found' };
  }

  const [group] = await db.insert(driverGroups).values({
    countryId: countryId || null,
    name: name.trim(),
    code: cleanCode,
    description: description?.trim() || null,
    isActive: Boolean(isActive),
  }).returning();

  return group;
}

export async function updateGroup(groupId, data) {
  const updates = { updatedAt: new Date() };

  if (data.name !== undefined) updates.name = String(data.name).trim();
  if (data.description !== undefined) updates.description = data.description ? String(data.description).trim() : null;
  if (data.isActive !== undefined) updates.isActive = Boolean(data.isActive);
  if (data.countryId !== undefined) updates.countryId = data.countryId || null;

  const [updated] = await db.update(driverGroups)
    .set(updates)
    .where(eq(driverGroups.id, groupId))
    .returning();

  if (!updated) throw { statusCode: 404, message: 'Driver group not found' };
  return updated;
}

export async function getGroupById(groupId) {
  const [group] = await db.select().from(driverGroups).where(eq(driverGroups.id, groupId)).limit(1);
  if (!group) throw { statusCode: 404, message: 'Driver group not found' };

  const [{ memberCount }] = await db.select({ memberCount: count() })
    .from(driverGroupMembers)
    .where(eq(driverGroupMembers.groupId, groupId));

  return { ...group, memberCount: Number(memberCount) };
}

export async function listGroups({ page, limit, offset, countryId, isActive, search }) {
  const conditions = [];

  if (countryId) conditions.push(eq(driverGroups.countryId, countryId));
  if (isActive !== undefined) conditions.push(eq(driverGroups.isActive, isActive));
  if (search) {
    const term = `%${search}%`;
    conditions.push(sql`(${driverGroups.name} ILIKE ${term} OR ${driverGroups.code} ILIKE ${term})`);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(driverGroups).where(where);

  const rows = await db.select({
    id: driverGroups.id,
    countryId: driverGroups.countryId,
    name: driverGroups.name,
    code: driverGroups.code,
    description: driverGroups.description,
    isActive: driverGroups.isActive,
    createdAt: driverGroups.createdAt,
    updatedAt: driverGroups.updatedAt,
    memberCount: count(driverGroupMembers.id),
  })
    .from(driverGroups)
    .leftJoin(driverGroupMembers, eq(driverGroupMembers.groupId, driverGroups.id))
    .where(where)
    .groupBy(driverGroups.id)
    .orderBy(desc(driverGroups.createdAt))
    .limit(limit)
    .offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function deleteGroup(groupId) {
  // Remove group members first
  await db.delete(driverGroupMembers).where(eq(driverGroupMembers.groupId, groupId));
  const [deleted] = await db.delete(driverGroups).where(eq(driverGroups.id, groupId)).returning();
  if (!deleted) throw { statusCode: 404, message: 'Driver group not found' };
  return { success: true, id: groupId };
}

// ── Group Membership Management ───────────────────────────────────────────────

export async function addDriversToGroup(groupId, driverIds, expiresAt = null) {
  if (!Array.isArray(driverIds) || driverIds.length === 0) {
    throw { statusCode: 400, message: 'driverIds must be a non-empty array' };
  }

  const [group] = await db.select({ id: driverGroups.id, name: driverGroups.name })
    .from(driverGroups)
    .where(eq(driverGroups.id, groupId))
    .limit(1);

  if (!group) throw { statusCode: 404, message: 'Driver group not found' };

  const validDrivers = await db.select({ id: drivers.id })
    .from(drivers)
    .where(inArray(drivers.id, driverIds));

  const validDriverIds = validDrivers.map((d) => d.id);
  if (validDriverIds.length === 0) {
    throw { statusCode: 404, message: 'No valid drivers found for given IDs' };
  }

  // Get existing members to avoid duplicate entries
  const existingMembers = await db.select({ driverId: driverGroupMembers.driverId })
    .from(driverGroupMembers)
    .where(
      and(
        eq(driverGroupMembers.groupId, groupId),
        inArray(driverGroupMembers.driverId, validDriverIds)
      )
    );

  const existingDriverIdSet = new Set(existingMembers.map((m) => m.driverId));
  const toInsert = validDriverIds
    .filter((id) => !existingDriverIdSet.has(id))
    .map((driverId) => ({
      groupId,
      driverId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }));

  let insertedCount = 0;
  if (toInsert.length > 0) {
    const inserted = await db.insert(driverGroupMembers).values(toInsert).returning();
    insertedCount = inserted.length;
  }

  return {
    groupId,
    groupName: group.name,
    addedCount: insertedCount,
    skippedCount: validDriverIds.length - insertedCount,
  };
}

export async function removeDriverFromGroup(groupId, driverId) {
  const [removed] = await db.delete(driverGroupMembers)
    .where(
      and(
        eq(driverGroupMembers.groupId, groupId),
        eq(driverGroupMembers.driverId, driverId)
      )
    )
    .returning();

  if (!removed) {
    throw { statusCode: 404, message: 'Driver is not a member of this group' };
  }

  return { success: true, groupId, driverId };
}

export async function listGroupMembers(groupId, { page, limit, offset, search }) {
  const [group] = await db.select().from(driverGroups).where(eq(driverGroups.id, groupId)).limit(1);
  if (!group) throw { statusCode: 404, message: 'Driver group not found' };

  const conditions = [eq(driverGroupMembers.groupId, groupId)];
  if (search) {
    const term = `%${search}%`;
    conditions.push(sql`(${drivers.name} ILIKE ${term} OR ${drivers.phone} ILIKE ${term})`);
  }

  const where = and(...conditions);

  const [{ total }] = await db.select({ total: count() })
    .from(driverGroupMembers)
    .innerJoin(drivers, eq(driverGroupMembers.driverId, drivers.id))
    .where(where);

  const rows = await db.select({
    id: driverGroupMembers.id,
    assignedAt: driverGroupMembers.assignedAt,
    expiresAt: driverGroupMembers.expiresAt,
    driver: {
      id: drivers.id,
      name: drivers.name,
      phone: drivers.phone,
      email: drivers.email,
      rating: drivers.rating,
      isOnline: drivers.isOnline,
      subscriptionStatus: drivers.subscriptionStatus,
      approvalStatus: drivers.approvalStatus,
    },
  })
    .from(driverGroupMembers)
    .innerJoin(drivers, eq(driverGroupMembers.driverId, drivers.id))
    .where(where)
    .orderBy(desc(driverGroupMembers.assignedAt))
    .limit(limit)
    .offset(offset);

  return { group, rows, pagination: paginate(page, limit, total) };
}

export async function getDriverActiveGroupIds(driverId) {
  if (!driverId) return [];
  const now = new Date();
  const rows = await db.select({ groupId: driverGroupMembers.groupId })
    .from(driverGroupMembers)
    .innerJoin(driverGroups, eq(driverGroupMembers.groupId, driverGroups.id))
    .where(
      and(
        eq(driverGroupMembers.driverId, driverId),
        eq(driverGroups.isActive, true),
        sql`(${driverGroupMembers.expiresAt} IS NULL OR ${driverGroupMembers.expiresAt} > ${now})`
      )
    );

  return rows.map((r) => r.groupId);
}

export async function getDriverGroups(driverId) {
  if (!driverId) return [];
  const now = new Date();
  const rows = await db.select({
    membershipId: driverGroupMembers.id,
    groupId: driverGroups.id,
    name: driverGroups.name,
    code: driverGroups.code,
    description: driverGroups.description,
    assignedAt: driverGroupMembers.assignedAt,
    expiresAt: driverGroupMembers.expiresAt,
  })
    .from(driverGroupMembers)
    .innerJoin(driverGroups, eq(driverGroupMembers.groupId, driverGroups.id))
    .where(
      and(
        eq(driverGroupMembers.driverId, driverId),
        eq(driverGroups.isActive, true),
        sql`(${driverGroupMembers.expiresAt} IS NULL OR ${driverGroupMembers.expiresAt} > ${now})`
      )
    )
    .orderBy(desc(driverGroupMembers.assignedAt));

  return rows;
}
