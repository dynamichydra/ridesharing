import { eq, and, desc, ne, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { driverVehicles, drivers, vehicleModels, vehicleInspections } from '../../../drizzle/schema/index.js';
import { advanceRegistration, REGISTRATION_STEP } from '../../utils/registration.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

async function assertRegistrationUnique(registrationNumber, excludeVehicleId = null) {
  if (!registrationNumber) return;
  const reg = registrationNumber.trim();
  const conditions = [
    sql`lower(${driverVehicles.registrationNumber}) = lower(${reg})`
  ];
  if (excludeVehicleId) {
    conditions.push(ne(driverVehicles.id, excludeVehicleId));
  }
  const [existing] = await db.select({ id: driverVehicles.id, registrationNumber: driverVehicles.registrationNumber })
    .from(driverVehicles)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw {
      statusCode: 409,
      message: `A vehicle with registration number '${registrationNumber}' is already registered.`,
    };
  }
}

function handleVehicleDbError(err, registrationNumber) {
  if (
    err?.code === '23505' ||
    err?.cause?.code === '23505' ||
    (typeof err?.message === 'string' && err.message.includes('driver_vehicles_registration_number_key'))
  ) {
    throw {
      statusCode: 409,
      message: `A vehicle with registration number '${registrationNumber || 'specified'}' is already registered.`,
    };
  }
  throw err;
}

// vehicleTypeId/brand/model are never taken from the client — they're resolved here from the
// admin-curated vehicle_models catalog, so a driver can't self-declare a base vehicle as a
// premium category (e.g. an old hatchback registered as "Premium Cab").
async function resolveVehicleModel(vehicleModelId) {
  const [vm] = await db.select().from(vehicleModels).where(eq(vehicleModels.id, vehicleModelId)).limit(1);
  if (!vm || !vm.isActive) throw { statusCode: 400, message: 'Invalid vehicle model' };
  return vm;
}

async function mirrorToDriver(driverId, vehicle) {
  // Fare/matching modules still read the vehicle summary directly off `drivers` —
  // keep that in sync with whichever vehicle is currently active for this driver.
  await db.update(drivers).set({
    vehicleTypeId: vehicle.vehicleTypeId,
    vehicleNumber: vehicle.registrationNumber,
    vehicleModel: vehicle.model,
    vehicleYear: vehicle.year,
    updatedAt: new Date(),
  }).where(eq(drivers.id, driverId));
}

export async function listMyVehicles(driverId) {
  return db.select().from(driverVehicles).where(eq(driverVehicles.driverId, driverId));
}

export async function addVehicle(driverId, data) {
  const { vehicleTypeId, brand, model, ...rest } = data; // ignore any client-supplied type/brand/model
  if (rest.registrationNumber) {
    rest.registrationNumber = rest.registrationNumber.trim().toUpperCase();
    await assertRegistrationUnique(rest.registrationNumber);
  }
  const vm = await resolveVehicleModel(data.vehicleModelId);

  // Single active vehicle per driver for now — deactivate any previous one.
  await db.update(driverVehicles).set({ isActive: false })
    .where(and(eq(driverVehicles.driverId, driverId), eq(driverVehicles.isActive, true)));

  try {
    const [vehicle] = await db.insert(driverVehicles).values({
      ...rest, driverId, isActive: true,
      vehicleModelId: vm.id, vehicleTypeId: vm.vehicleTypeId, brand: vm.brand, model: vm.name,
    }).returning();
    await mirrorToDriver(driverId, vehicle);
    await advanceRegistration(driverId, REGISTRATION_STEP.VEHICLE);
    return vehicle;
  } catch (err) {
    handleVehicleDbError(err, rest.registrationNumber);
  }
}

export async function updateVehicle(driverId, vehicleId, data) {
  const { vehicleTypeId, brand, model, ...rest } = data; // ignore any client-supplied type/brand/model
  if (rest.registrationNumber) {
    rest.registrationNumber = rest.registrationNumber.trim().toUpperCase();
    await assertRegistrationUnique(rest.registrationNumber, vehicleId);
  }
  if (data.vehicleModelId) {
    const vm = await resolveVehicleModel(data.vehicleModelId);
    rest.vehicleModelId = vm.id;
    rest.vehicleTypeId = vm.vehicleTypeId;
    rest.brand = vm.brand;
    rest.model = vm.name;
  }

  try {
    const [vehicle] = await db.update(driverVehicles).set({ ...rest, updatedAt: new Date() })
      .where(and(eq(driverVehicles.id, vehicleId), eq(driverVehicles.driverId, driverId))).returning();
    if (!vehicle) throw { statusCode: 404, message: 'Vehicle not found' };
    if (vehicle.isActive) await mirrorToDriver(driverId, vehicle);
    return vehicle;
  } catch (err) {
    handleVehicleDbError(err, rest.registrationNumber);
  }
}

export async function removeVehicle(driverId, vehicleId) {
  const [vehicle] = await db.update(driverVehicles).set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(driverVehicles.id, vehicleId), eq(driverVehicles.driverId, driverId))).returning();
  if (!vehicle) throw { statusCode: 404, message: 'Vehicle not found' };
  return { deleted: true };
}

export async function listDriverVehicles(driverId) {
  return db.select().from(driverVehicles).where(eq(driverVehicles.driverId, driverId));
}

export async function adminAddVehicle(driverId, adminId, data) {
  const { vehicleTypeId, brand, model, ...rest } = data;
  if (rest.registrationNumber) {
    rest.registrationNumber = rest.registrationNumber.trim().toUpperCase();
    await assertRegistrationUnique(rest.registrationNumber);
  }
  let vm = null;
  if (data.vehicleModelId) {
    vm = await resolveVehicleModel(data.vehicleModelId);
  }

  const shouldBeActive = data.isActive !== false;
  if (shouldBeActive) {
    await db.update(driverVehicles).set({ isActive: false })
      .where(and(eq(driverVehicles.driverId, driverId), eq(driverVehicles.isActive, true)));
  }

  try {
    const [vehicle] = await db.insert(driverVehicles).values({
      ...rest,
      driverId,
      isActive: shouldBeActive,
      vehicleModelId: vm ? vm.id : data.vehicleModelId || null,
      vehicleTypeId: vm ? vm.vehicleTypeId : data.vehicleTypeId || null,
      brand: vm ? vm.brand : data.brand || null,
      model: vm ? vm.name : data.model || 'Unknown',
    }).returning();

    if (shouldBeActive) {
      await mirrorToDriver(driverId, vehicle);
    }

    await publishEvent(TOPICS.AUDIT_LOG, {
      actorId: adminId, actorType: 'admin',
      action: 'DRIVER_VEHICLE_ADDED_BY_ADMIN', entityType: 'driver_vehicle', entityId: vehicle.id,
      meta: { driverId },
    });

    return vehicle;
  } catch (err) {
    handleVehicleDbError(err, rest.registrationNumber);
  }
}

export async function adminUpdateVehicle(driverId, vehicleId, adminId, data) {
  const { vehicleTypeId, brand, model, ...rest } = data;
  if (rest.registrationNumber) {
    rest.registrationNumber = rest.registrationNumber.trim().toUpperCase();
    await assertRegistrationUnique(rest.registrationNumber, vehicleId);
  }
  if (data.vehicleModelId) {
    const vm = await resolveVehicleModel(data.vehicleModelId);
    rest.vehicleModelId = vm.id;
    rest.vehicleTypeId = vm.vehicleTypeId;
    rest.brand = vm.brand;
    rest.model = vm.name;
  }

  if (data.isActive === true) {
    await db.update(driverVehicles).set({ isActive: false })
      .where(and(eq(driverVehicles.driverId, driverId), eq(driverVehicles.isActive, true)));
  }

  try {
    const [vehicle] = await db.update(driverVehicles).set({ ...rest, updatedAt: new Date() })
      .where(and(eq(driverVehicles.id, vehicleId), eq(driverVehicles.driverId, driverId))).returning();
    if (!vehicle) throw { statusCode: 404, message: 'Vehicle not found' };

    if (vehicle.isActive) await mirrorToDriver(driverId, vehicle);

    await publishEvent(TOPICS.AUDIT_LOG, {
      actorId: adminId, actorType: 'admin',
      action: 'DRIVER_VEHICLE_UPDATED_BY_ADMIN', entityType: 'driver_vehicle', entityId: vehicleId,
      meta: { driverId },
    });

    return vehicle;
  } catch (err) {
    handleVehicleDbError(err, rest.registrationNumber);
  }
}

export async function adminRemoveVehicle(driverId, vehicleId, adminId) {
  const [vehicle] = await db.delete(driverVehicles)
    .where(and(eq(driverVehicles.id, vehicleId), eq(driverVehicles.driverId, driverId))).returning();
  if (!vehicle) throw { statusCode: 404, message: 'Vehicle not found' };

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_VEHICLE_DELETED_BY_ADMIN', entityType: 'driver_vehicle', entityId: vehicleId,
    meta: { driverId },
  });

  return { deleted: true };
}

export async function adminActivateVehicle(driverId, vehicleId, adminId) {
  await db.update(driverVehicles).set({ isActive: false })
    .where(and(eq(driverVehicles.driverId, driverId), eq(driverVehicles.isActive, true)));

  const [vehicle] = await db.update(driverVehicles).set({ isActive: true, updatedAt: new Date() })
    .where(and(eq(driverVehicles.id, vehicleId), eq(driverVehicles.driverId, driverId))).returning();
  if (!vehicle) throw { statusCode: 404, message: 'Vehicle not found' };

  await mirrorToDriver(driverId, vehicle);

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_VEHICLE_ACTIVATED_BY_ADMIN', entityType: 'driver_vehicle', entityId: vehicleId,
    meta: { driverId },
  });

  return vehicle;
}

/**
 * Driver self-service: switch active vehicle among registered vehicles.
 */
export async function activateVehicle(driverId, vehicleId) {
  const [vehicleToActivate] = await db.select().from(driverVehicles)
    .where(and(eq(driverVehicles.id, vehicleId), eq(driverVehicles.driverId, driverId))).limit(1);

  if (!vehicleToActivate) throw { statusCode: 404, message: 'Vehicle not found' };

  // Deactivate other vehicles
  await db.update(driverVehicles).set({ isActive: false })
    .where(and(eq(driverVehicles.driverId, driverId), eq(driverVehicles.isActive, true)));

  const [activated] = await db.update(driverVehicles).set({ isActive: true, updatedAt: new Date() })
    .where(and(eq(driverVehicles.id, vehicleId))).returning();

  await mirrorToDriver(driverId, activated);

  return activated;
}

/**
 * Record a vehicle inspection (Admin/Inspector).
 */
export async function recordInspection(driverId, vehicleId, inspectorId, { status = 'passed', checklistResults, notes, expiresAt }) {
  const [vehicle] = await db.select().from(driverVehicles)
    .where(and(eq(driverVehicles.id, vehicleId), eq(driverVehicles.driverId, driverId))).limit(1);

  if (!vehicle) throw { statusCode: 404, message: 'Vehicle not found' };

  const [inspection] = await db.insert(vehicleInspections).values({
    vehicleId,
    driverId,
    inspectorId,
    status,
    checklistResults: checklistResults || {},
    notes: notes || null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();

  return inspection;
}

/**
 * List inspections for a vehicle.
 */
export async function listVehicleInspections(vehicleId) {
  return db.select().from(vehicleInspections)
    .where(eq(vehicleInspections.vehicleId, vehicleId))
    .orderBy(desc(vehicleInspections.inspectionDate));
}

/**
 * List all vehicles across drivers (Admin / Filtered).
 */
export async function listAllVehicles(filters = {}) {
  const conditions = [];
  if (filters.driverId) {
    conditions.push(eq(driverVehicles.driverId, filters.driverId));
  }
  if (filters.vehicleTypeId) {
    conditions.push(eq(driverVehicles.vehicleTypeId, filters.vehicleTypeId));
  }
  if (filters.isActive !== undefined && filters.isActive !== null && filters.isActive !== '') {
    const activeBool = typeof filters.isActive === 'boolean' ? filters.isActive : String(filters.isActive) === 'true';
    conditions.push(eq(driverVehicles.isActive, activeBool));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(driverVehicles).where(where).orderBy(desc(driverVehicles.createdAt));
}

/**
 * Get a single vehicle by ID.
 */
export async function getVehicleById(vehicleId) {
  const [vehicle] = await db.select().from(driverVehicles).where(eq(driverVehicles.id, vehicleId)).limit(1);
  return vehicle || null;
}
