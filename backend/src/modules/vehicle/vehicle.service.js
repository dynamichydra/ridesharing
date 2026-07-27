import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { driverVehicles, drivers, vehicleModels } from '../../../drizzle/schema/index.js';
import { advanceRegistration, REGISTRATION_STEP } from '../../utils/registration.js';

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
    vehicleModel:  vehicle.model,
    vehicleYear:   vehicle.year,
    updatedAt:     new Date(),
  }).where(eq(drivers.id, driverId));
}

export async function listMyVehicles(driverId) {
  return db.select().from(driverVehicles).where(eq(driverVehicles.driverId, driverId));
}

export async function addVehicle(driverId, data) {
  const { vehicleTypeId, brand, model, ...rest } = data; // ignore any client-supplied type/brand/model
  const vm = await resolveVehicleModel(data.vehicleModelId);

  // Single active vehicle per driver for now — deactivate any previous one.
  await db.update(driverVehicles).set({ isActive: false })
    .where(and(eq(driverVehicles.driverId, driverId), eq(driverVehicles.isActive, true)));

  const [vehicle] = await db.insert(driverVehicles).values({
    ...rest, driverId, isActive: true,
    vehicleModelId: vm.id, vehicleTypeId: vm.vehicleTypeId, brand: vm.brand, model: vm.name,
  }).returning();
  await mirrorToDriver(driverId, vehicle);
  await advanceRegistration(driverId, REGISTRATION_STEP.VEHICLE);
  return vehicle;
}

export async function updateVehicle(driverId, vehicleId, data) {
  const { vehicleTypeId, brand, model, ...rest } = data; // ignore any client-supplied type/brand/model
  if (data.vehicleModelId) {
    const vm = await resolveVehicleModel(data.vehicleModelId);
    rest.vehicleModelId = vm.id;
    rest.vehicleTypeId = vm.vehicleTypeId;
    rest.brand = vm.brand;
    rest.model = vm.name;
  }

  const [vehicle] = await db.update(driverVehicles).set({ ...rest, updatedAt: new Date() })
    .where(and(eq(driverVehicles.id, vehicleId), eq(driverVehicles.driverId, driverId))).returning();
  if (!vehicle) throw { statusCode: 404, message: 'Vehicle not found' };
  if (vehicle.isActive) await mirrorToDriver(driverId, vehicle);
  return vehicle;
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
