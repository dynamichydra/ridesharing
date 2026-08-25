import { eq, and, lte, gte, lt, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import { driverDocuments, documentTypes, drivers } from '../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../config/kafka.js';
import { removeDriverFromIndex } from '../modules/matching/driver-geo-index.service.js';

/**
 * Worker job to check document expirations, dispatch advance warnings,
 * mark expired documents, and suspend non-compliant drivers.
 */
export async function checkDocumentExpirations() {
  const now = new Date();
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneDayAhead = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  let warningSentCount = 0;
  let expiredUpdatedCount = 0;

  // 1. Process Expired Documents (expiryDate <= now and status != 'expired')
  const expiredDocs = await db.select({
    id: driverDocuments.id,
    driverId: driverDocuments.driverId,
    documentCode: documentTypes.code,
    expiryDate: driverDocuments.expiryDate,
  }).from(driverDocuments)
    .innerJoin(documentTypes, eq(documentTypes.id, driverDocuments.documentTypeId))
    .where(and(
      lte(driverDocuments.expiryDate, now),
      eq(driverDocuments.status, 'approved'),
    ));

  for (const doc of expiredDocs) {
    await db.update(driverDocuments).set({
      status: 'expired',
    }).where(eq(driverDocuments.id, doc.id));

    expiredUpdatedCount++;

    // Critical documents (Driver License, Commercial Permit, Insurance) cause driver suspension
    const isCritical = ['DRIVERS_LICENSE', 'COMMERCIAL_PERMIT', 'VEHICLE_INSURANCE', 'VEHICLE_REGISTRATION'].includes(doc.documentCode);

    if (isCritical) {
      await db.update(drivers).set({
        isOnline: false,
        isBlocked: true,
        blockReason: `Critical document ${doc.documentCode} has expired on ${doc.expiryDate?.toISOString().split('T')[0]}. Please upload a renewed copy.`,
        updatedAt: new Date(),
      }).where(eq(drivers.id, doc.driverId));

      await removeDriverFromIndex(doc.driverId).catch(() => {});
    }

    await publishEvent(TOPICS.NOTIF_PUSH, {
      userType: 'driver',
      userId: doc.driverId,
      type: 'DOCUMENT_EXPIRED',
      title: 'Document Expired ⚠️',
      body: `Your ${doc.documentCode} has expired. Please upload renewed documentation to stay active.`,
    }).catch(() => {});
  }

  // 2. Process Advance Warning (e.g. expiring within 7 days)
  const expiringSoonDocs = await db.select({
    id: driverDocuments.id,
    driverId: driverDocuments.driverId,
    documentCode: documentTypes.code,
    expiryDate: driverDocuments.expiryDate,
  }).from(driverDocuments)
    .innerJoin(documentTypes, eq(documentTypes.id, driverDocuments.documentTypeId))
    .where(and(
      gte(driverDocuments.expiryDate, now),
      lte(driverDocuments.expiryDate, sevenDaysAhead),
      eq(driverDocuments.status, 'approved'),
    ));

  for (const doc of expiringSoonDocs) {
    warningSentCount++;
    const daysLeft = Math.ceil((new Date(doc.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    await publishEvent(TOPICS.NOTIF_PUSH, {
      userType: 'driver',
      userId: doc.driverId,
      type: 'DOCUMENT_EXPIRING_SOON',
      title: 'Document Expiring Soon ⏳',
      body: `Your ${doc.documentCode} will expire in ${daysLeft} day(s). Upload renewal to prevent disruption.`,
    }).catch(() => {});
  }

  console.log(`[DocumentExpiryJob] Completed: ${expiredUpdatedCount} document(s) expired, ${warningSentCount} warning(s) sent.`);
  return { expiredUpdatedCount, warningSentCount };
}
