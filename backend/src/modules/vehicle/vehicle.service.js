import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { driverVehicles, drivers, vehicleTypes } from '../../../drizzle/schema/index.js';
import { advanceRegistration, REGISTRATION_STEP } from '../../utils/registration.js';

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
  const [vt] = await db.select().from(vehicleTypes).where(eq(vehicleTypes.id, data.vehicleTypeId)).limit(1);
  if (!vt || !vt.isActive) throw { statusCode: 400, message: 'Invalid vehicle type' };

  // Single active vehicle per driver for now — deactivate any previous one.
  await db.update(driverVehicles).set({ isActive: false })
    .where(and(eq(driverVehicles.driverId, driverId), eq(driverVehicles.isActive, true)));

  const [vehicle] = await db.insert(driverVehicles).values({ ...data, driverId, isActive: true }).returning();
  await mirrorToDriver(driverId, vehicle);
  await advanceRegistration(driverId, REGISTRATION_STEP.VEHICLE);
  return vehicle;
}

export async function updateVehicle(driverId, vehicleId, data) {
  const [vehicle] = await db.update(driverVehicles).set({ ...data, updatedAt: new Date() })
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
