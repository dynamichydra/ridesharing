import { eq } from 'drizzle-orm';
import { db } from '../config/db.js';
import { drivers } from '../../drizzle/schema/index.js';

export const REGISTRATION_STEP = {
  PERSONAL_INFO: 2,
  LEGAL: 3,
  LOCATION: 4,
  QUESTIONNAIRE: 5,
  VEHICLE: 6,
  DOCUMENTS: 7,
  PHOTO: 8,
  BANK: 9,
  EMERGENCY_CONTACT: 10,
  REVIEW: 11,
  SUBMITTED: 12,
};

// Statuses where reaching a new step just means "still filling out the form" —
// once a driver is documents_pending/pending_review/etc. their status is driven
// by explicit transitions (submit, admin actions), not by touching a step endpoint.
const IN_PROGRESS_STATUSES = ['new', 'mobile_verified', 'email_verified', 'registration_in_progress'];

/** Bump a driver's furthest-completed registration step; only touches status while still mid-onboarding. */
export async function advanceRegistration(driverId, step) {
  const [driver] = await db.select({
    registrationStatus: drivers.registrationStatus,
    registrationStep: drivers.registrationStep,
  }).from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!driver) throw { statusCode: 404, message: 'Driver not found' };

  const patch = { updatedAt: new Date() };
  if (step > (driver.registrationStep ?? 0)) patch.registrationStep = step;
  if (IN_PROGRESS_STATUSES.includes(driver.registrationStatus) && driver.registrationStatus !== 'registration_in_progress') {
    patch.registrationStatus = 'registration_in_progress';
  }
  await db.update(drivers).set(patch).where(eq(drivers.id, driverId));
}
