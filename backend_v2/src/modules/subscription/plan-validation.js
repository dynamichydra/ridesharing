import { inArray } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { vehicleTypes, driverGroups } from '../../../drizzle/schema/index.js';

const MAX_FEATURES = 20;
const MAX_FEATURE_LENGTH = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// features is freeform marketing copy (display-only, never enforced) — just keep it sane.
function normalizeFeatures(features) {
  if (!Array.isArray(features)) throw { statusCode: 400, message: 'features must be an array of strings' };
  const cleaned = [...new Set(features.map((f) => String(f).trim()).filter(Boolean))];
  if (cleaned.length > MAX_FEATURES) {
    throw { statusCode: 400, message: `features can have at most ${MAX_FEATURES} entries` };
  }
  if (cleaned.some((f) => f.length > MAX_FEATURE_LENGTH)) {
    throw { statusCode: 400, message: `each feature entry must be at most ${MAX_FEATURE_LENGTH} characters` };
  }
  return cleaned;
}

async function normalizeVehicleTypeIds(vehicleTypeIds) {
  if (!Array.isArray(vehicleTypeIds) || vehicleTypeIds.length === 0) {
    throw { statusCode: 400, message: 'vehicleTypeIds must be a non-empty array of vehicle type ids, or omitted/null to allow all types' };
  }
  const ids = [...new Set(vehicleTypeIds.map(String))];
  if (ids.some((id) => !UUID_RE.test(id))) {
    throw { statusCode: 400, message: 'vehicleTypeIds must all be valid vehicle type ids' };
  }
  const found = await db.select({ id: vehicleTypes.id }).from(vehicleTypes).where(inArray(vehicleTypes.id, ids));
  if (found.length !== ids.length) {
    throw { statusCode: 400, message: 'vehicleTypeIds contains an unknown vehicle type id' };
  }
  return ids;
}

async function normalizeAllowedGroupIds(allowedGroupIds) {
  if (allowedGroupIds === null || allowedGroupIds === undefined) return null;
  if (!Array.isArray(allowedGroupIds)) {
    throw { statusCode: 400, message: 'allowedGroupIds must be an array of driver group IDs, or null' };
  }
  if (allowedGroupIds.length === 0) return null;

  const ids = [...new Set(allowedGroupIds.map(String))];
  if (ids.some((id) => !UUID_RE.test(id))) {
    throw { statusCode: 400, message: 'allowedGroupIds must all be valid UUIDs' };
  }
  const found = await db.select({ id: driverGroups.id }).from(driverGroups).where(inArray(driverGroups.id, ids));
  if (found.length !== ids.length) {
    throw { statusCode: 400, message: 'allowedGroupIds contains an unknown driver group ID' };
  }
  return ids;
}

function normalizeMaxRidesPerDay(maxRidesPerDay) {
  const n = Number(maxRidesPerDay);
  if (!Number.isInteger(n) || n < 0) {
    throw { statusCode: 400, message: 'maxRidesPerDay must be a non-negative integer, or null for unlimited' };
  }
  return n;
}

function normalizeEntitlements(entitlements) {
  if (entitlements === null || entitlements === undefined) return null;
  if (typeof entitlements !== 'object' || Array.isArray(entitlements)) {
    throw { statusCode: 400, message: 'entitlements must be a key-value object' };
  }

  const cleaned = { ...entitlements };

  if (cleaned.commissionRate !== undefined && cleaned.commissionRate !== null) {
    let rate = Number(cleaned.commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      throw { statusCode: 400, message: 'entitlements.commissionRate must be a decimal between 0.0 and 1.0 (e.g. 0.10 for 10%)' };
    }
    cleaned.commissionRate = rate;
  }

  if (cleaned.priorityScoreBonus !== undefined && cleaned.priorityScoreBonus !== null) {
    let bonus = Number(cleaned.priorityScoreBonus);
    if (isNaN(bonus) || bonus < 0 || bonus > 1) {
      throw { statusCode: 400, message: 'entitlements.priorityScoreBonus must be a number between 0.0 and 1.0' };
    }
    cleaned.priorityScoreBonus = bonus;
  }

  if (cleaned.maxRidesPerDay !== undefined && cleaned.maxRidesPerDay !== null) {
    cleaned.maxRidesPerDay = normalizeMaxRidesPerDay(cleaned.maxRidesPerDay);
  }

  return cleaned;
}

// Shared by both driver subscription_plans and rider_subscription_plans — rider plans don't have
// vehicleTypeIds/maxRidesPerDay/priorityMatching/entitlements/allowedGroupIds columns, so those keys are simply never present
// on rider plan payloads and this function skips them.
export async function normalizePlanPayload(data) {
  const normalized = { ...data };

  if (normalized.features !== undefined && normalized.features !== null) {
    normalized.features = normalizeFeatures(normalized.features);
  }

  if (normalized.vehicleTypeIds !== undefined && normalized.vehicleTypeIds !== null) {
    normalized.vehicleTypeIds = await normalizeVehicleTypeIds(normalized.vehicleTypeIds);
  }

  if (normalized.allowedGroupIds !== undefined) {
    normalized.allowedGroupIds = await normalizeAllowedGroupIds(normalized.allowedGroupIds);
  }

  if (normalized.maxRidesPerDay !== undefined && normalized.maxRidesPerDay !== null) {
    normalized.maxRidesPerDay = normalizeMaxRidesPerDay(normalized.maxRidesPerDay);
  }

  if (normalized.priorityMatching !== undefined && typeof normalized.priorityMatching !== 'boolean') {
    throw { statusCode: 400, message: 'priorityMatching must be a boolean' };
  }

  if (normalized.entitlements !== undefined) {
    normalized.entitlements = normalizeEntitlements(normalized.entitlements);
  }

  return normalized;
}
