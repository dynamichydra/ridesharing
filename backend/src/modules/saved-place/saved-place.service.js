import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { savedPlaces } from '../../../drizzle/schema/index.js';

export async function upsertSavedPlace(userId, data) {
  const { label, name, address, lat, lng, isDefaultPickup } = data || {};

  if (!label || !address || lat == null || lng == null) {
    throw { statusCode: 400, message: 'label, address, lat, and lng are required' };
  }

  const cleanLabel = String(label).trim().toLowerCase();
  const cleanLat = String(lat);
  const cleanLng = String(lng);
  const displayName = name ? String(name).trim() : (cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1));

  if (['home', 'work'].includes(cleanLabel)) {
    const [existing] = await db.select().from(savedPlaces)
      .where(and(eq(savedPlaces.userId, userId), eq(savedPlaces.label, cleanLabel)))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(savedPlaces).set({
        name: displayName,
        address: String(address).trim(),
        lat: cleanLat,
        lng: cleanLng,
        isDefaultPickup: isDefaultPickup !== undefined ? Boolean(isDefaultPickup) : existing.isDefaultPickup,
        updatedAt: new Date(),
      }).where(eq(savedPlaces.id, existing.id)).returning();

      return updated;
    }
  }

  const [inserted] = await db.insert(savedPlaces).values({
    userId,
    label: cleanLabel,
    name: displayName,
    address: String(address).trim(),
    lat: cleanLat,
    lng: cleanLng,
    isDefaultPickup: Boolean(isDefaultPickup),
  }).returning();

  return inserted;
}

export async function listSavedPlaces(userId) {
  const places = await db.select().from(savedPlaces)
    .where(eq(savedPlaces.userId, userId))
    .orderBy(desc(savedPlaces.createdAt));

  const priorityMap = { home: 1, work: 2 };

  return places.sort((a, b) => {
    const pA = priorityMap[a.label] || 99;
    const pB = priorityMap[b.label] || 99;
    return pA - pB;
  });
}

export async function updateSavedPlace(userId, id, updates) {
  const [existing] = await db.select().from(savedPlaces)
    .where(and(eq(savedPlaces.id, id), eq(savedPlaces.userId, userId))).limit(1);

  if (!existing) throw { statusCode: 404, message: 'Saved place not found' };

  const patch = { updatedAt: new Date() };
  if (updates.name !== undefined) patch.name = String(updates.name).trim();
  if (updates.address !== undefined) patch.address = String(updates.address).trim();
  if (updates.lat !== undefined) patch.lat = String(updates.lat);
  if (updates.lng !== undefined) patch.lng = String(updates.lng);
  if (updates.isDefaultPickup !== undefined) patch.isDefaultPickup = Boolean(updates.isDefaultPickup);

  const [updated] = await db.update(savedPlaces)
    .set(patch)
    .where(eq(savedPlaces.id, existing.id))
    .returning();

  return updated;
}

export async function deleteSavedPlace(userId, id) {
  const [deleted] = await db.delete(savedPlaces)
    .where(and(eq(savedPlaces.id, id), eq(savedPlaces.userId, userId)))
    .returning();

  if (!deleted) throw { statusCode: 404, message: 'Saved place not found' };
  return deleted;
}
