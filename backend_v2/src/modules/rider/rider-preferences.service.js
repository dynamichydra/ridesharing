import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { riderPreferences } from '../../../drizzle/schema/index.js';

const DEFAULT_PREFERENCES = {
  quietRide: false,
  temperature: 'no_preference',
  petFriendly: false,
  wheelchairAccessible: false,
  childSeat: false,
  preferredLanguage: 'en',
  musicPreference: null,
};

export async function getRiderPreferences(userId) {
  const [prefs] = await db.select().from(riderPreferences).where(eq(riderPreferences.userId, userId)).limit(1);
  if (!prefs) {
    return { userId, ...DEFAULT_PREFERENCES };
  }
  return prefs;
}

export async function updateRiderPreferences(userId, data) {
  const [existing] = await db.select().from(riderPreferences).where(eq(riderPreferences.userId, userId)).limit(1);

  if (existing) {
    const [updated] = await db.update(riderPreferences).set({
      quietRide: data.quietRide !== undefined ? Boolean(data.quietRide) : existing.quietRide,
      temperature: data.temperature || existing.temperature,
      petFriendly: data.petFriendly !== undefined ? Boolean(data.petFriendly) : existing.petFriendly,
      wheelchairAccessible: data.wheelchairAccessible !== undefined ? Boolean(data.wheelchairAccessible) : existing.wheelchairAccessible,
      childSeat: data.childSeat !== undefined ? Boolean(data.childSeat) : existing.childSeat,
      preferredLanguage: data.preferredLanguage || existing.preferredLanguage,
      musicPreference: data.musicPreference !== undefined ? data.musicPreference : existing.musicPreference,
      updatedAt: new Date(),
    }).where(eq(riderPreferences.userId, userId)).returning();
    return updated;
  }

  const [created] = await db.insert(riderPreferences).values({
    userId,
    quietRide: Boolean(data.quietRide),
    temperature: data.temperature || 'no_preference',
    petFriendly: Boolean(data.petFriendly),
    wheelchairAccessible: Boolean(data.wheelchairAccessible),
    childSeat: Boolean(data.childSeat),
    preferredLanguage: data.preferredLanguage || 'en',
    musicPreference: data.musicPreference || null,
  }).returning();

  return created;
}
