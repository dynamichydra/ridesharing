import { eq, and, asc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  documentTypes, documentTypeRequirements, driverDocuments, drivers,
} from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { createUploadUrl, verifyObjectExists, createViewUrl } from '../../utils/storage.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { advanceRegistration, REGISTRATION_STEP } from '../../utils/registration.js';

const SIDE_COLUMN = { front: 'frontUrl', back: 'backUrl', pdf: 'pdfUrl' };

// ── Document types (admin) ──────────────────────────────────────────────────────

export async function listDocumentTypes(onlyActive = true) {
  const where = onlyActive ? eq(documentTypes.isActive, true) : undefined;
  return db.select().from(documentTypes).where(where).orderBy(asc(documentTypes.sortOrder));
}

export async function listDocumentTypesPaginated(page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(documentTypes);
  const rows = await db.select().from(documentTypes).orderBy(asc(documentTypes.sortOrder)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function createDocumentType(data) {
  const [row] = await db.insert(documentTypes).values(data).returning();
  return row;
}

export async function updateDocumentType(id, data) {
  const [row] = await db.update(documentTypes).set(data).where(eq(documentTypes.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Document type not found' };
  return row;
}

// ── Requirements (admin) ─────────────────────────────────────────────────────────

export async function listRequirements(documentTypeId) {
  return db.select().from(documentTypeRequirements).where(eq(documentTypeRequirements.documentTypeId, documentTypeId));
}

export async function createRequirement(data) {
  const [row] = await db.insert(documentTypeRequirements).values(data).returning();
  return row;
}

export async function removeRequirement(id) {
  await db.delete(documentTypeRequirements).where(eq(documentTypeRequirements.id, id));
  return { deleted: true };
}

/**
 * Resolve the effective required-document list for a driver's country/city/vehicle type.
 * A document type with no matching requirement row at all is treated as required by default
 * (documentTypes.requiresFront/etc. still govern which fields it needs).
 */
export async function getRequiredDocumentTypesFor(countryId, cityId, vehicleTypeId) {
  const types = await listDocumentTypes(true);
  const allRequirements = await db.select().from(documentTypeRequirements);

  return types.map((type) => {
    const scoped = allRequirements
      .filter((r) => r.documentTypeId === type.id)
      .filter((r) => !r.countryId || r.countryId === countryId)
      .filter((r) => !r.cityId || r.cityId === cityId)
      .filter((r) => !r.vehicleTypeId || r.vehicleTypeId === vehicleTypeId);
    // No matching rule at all = required by default; otherwise most-specific rule wins.
    const isRequired = scoped.length ? scoped.some((r) => r.isRequired) : true;
    return { ...type, isRequired };
  });
}

// ── Driver-facing upload flow ────────────────────────────────────────────────────

export async function requestUploadUrl(driverId, documentTypeId, side, contentType) {
  if (!SIDE_COLUMN[side]) throw { statusCode: 400, message: "side must be 'front', 'back' or 'pdf'" };

  const [docType] = await db.select().from(documentTypes).where(eq(documentTypes.id, documentTypeId)).limit(1);
  if (!docType || !docType.isActive) throw { statusCode: 404, message: 'Document type not found' };

  return createUploadUrl(`driver-documents/${driverId}/${documentTypeId}`, contentType, docType.maxFileSizeMb);
}

export async function confirmDocument(driverId, documentTypeId, { side, key, documentNumber, expiryDate }) {
  if (!SIDE_COLUMN[side]) throw { statusCode: 400, message: "side must be 'front', 'back' or 'pdf'" };

  const [docType] = await db.select().from(documentTypes).where(eq(documentTypes.id, documentTypeId)).limit(1);
  if (!docType || !docType.isActive) throw { statusCode: 404, message: 'Document type not found' };

  await verifyObjectExists(key, docType.maxFileSizeMb);

  if (expiryDate && new Date(expiryDate) <= new Date()) {
    throw { statusCode: 400, code: 'DOCUMENT_EXPIRED', message: 'This document has already expired' };
  }

  const [existing] = await db.select().from(driverDocuments)
    .where(and(eq(driverDocuments.driverId, driverId), eq(driverDocuments.documentTypeId, documentTypeId))).limit(1);

  const patch = {
    [SIDE_COLUMN[side]]: key,
    status: 'pending',
    uploadedAt: new Date(),
  };
  if (documentNumber !== undefined) patch.documentNumber = documentNumber;
  if (expiryDate !== undefined) patch.expiryDate = expiryDate;

  let row;
  if (existing) {
    [row] = await db.update(driverDocuments).set(patch).where(eq(driverDocuments.id, existing.id)).returning();
  } else {
    [row] = await db.insert(driverDocuments).values({ driverId, documentTypeId, ...patch }).returning();
  }
  await advanceRegistration(driverId, REGISTRATION_STEP.DOCUMENTS);
  return row;
}

export async function listMyDocuments(driverId) {
  return db.select().from(driverDocuments).where(eq(driverDocuments.driverId, driverId));
}

// ── Admin verification ───────────────────────────────────────────────────────────

export async function listDriverDocuments(driverId) {
  const rows = await db.select().from(driverDocuments).where(eq(driverDocuments.driverId, driverId));
  return Promise.all(rows.map(async (doc) => ({
    ...doc,
    frontViewUrl: await createViewUrl(doc.frontUrl),
    backViewUrl: await createViewUrl(doc.backUrl),
    pdfViewUrl: await createViewUrl(doc.pdfUrl),
  })));
}

export async function verifyDocument(docId, adminId, approve, rejectionReason) {
  const [doc] = await db.update(driverDocuments).set({
    status: approve ? 'approved' : 'rejected',
    rejectionReason: approve ? null : rejectionReason,
    verifiedBy: adminId,
    verifiedAt: new Date(),
  }).where(eq(driverDocuments.id, docId)).returning();
  if (!doc) throw { statusCode: 404, message: 'Document not found' };

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: approve ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
    entityType: 'driver_document', entityId: docId,
  });

  if (!approve) {
    const [driver] = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.id, doc.driverId)).limit(1);
    if (driver) {
      await publishEvent(TOPICS.NOTIF_PUSH, {
        userId: doc.driverId, userType: 'driver',
        title: 'Document rejected', body: rejectionReason || 'Please re-upload this document.',
        type: 'DOCUMENT_REJECTED',
      });
    }
  }
  return doc;
}
