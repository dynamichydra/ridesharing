import { eq, and, asc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  documentTypes, documentTypeRequirements, driverDocuments, drivers,
} from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { createUploadUrl, verifyObjectExists, createViewUrl } from '../../utils/storage.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { advanceRegistration, REGISTRATION_STEP } from '../../utils/registration.js';
import { publishNotification } from '../notification/notification-events.js';

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

export async function confirmDocument(driverId, documentTypeId, { side = 'front', key, documentNumber, expiryDate }) {
  const [docType] = await db.select().from(documentTypes).where(eq(documentTypes.id, documentTypeId)).limit(1);
  if (!docType || !docType.isActive) throw { statusCode: 404, message: 'Document type not found' };

  if (key && !key.startsWith('doc_mock_') && !key.startsWith('http')) {
    try {
      await verifyObjectExists(key, docType.maxFileSizeMb);
    } catch (_) {}
  }

  if (expiryDate && new Date(expiryDate) <= new Date()) {
    throw { statusCode: 400, code: 'DOCUMENT_EXPIRED', message: 'This document has already expired' };
  }

  const [existing] = await db.select().from(driverDocuments)
    .where(and(eq(driverDocuments.driverId, driverId), eq(driverDocuments.documentTypeId, documentTypeId))).limit(1);

  const finalKey = key || `doc_${driverId.slice(0, 6)}_${documentTypeId.slice(0, 6)}_${Date.now()}`;
  const sideCol = SIDE_COLUMN[side] || 'frontUrl';
  const patch = {
    [sideCol]: finalKey,
    status: 'pending',
    uploadedAt: new Date(),
  };
  if (documentNumber !== undefined && documentNumber !== null) patch.documentNumber = documentNumber;
  if (expiryDate !== undefined && expiryDate !== null) patch.expiryDate = new Date(expiryDate);

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
  const [types, myDocs] = await Promise.all([
    listDocumentTypes(true),
    db.select().from(driverDocuments).where(eq(driverDocuments.driverId, driverId)),
  ]);

  const docByType = new Map(myDocs.map((d) => [d.documentTypeId, d]));

  return types.map((type) => {
    const doc = docByType.get(type.id);
    return {
      documentTypeId: type.id,
      code: type.code,
      name: type.name || type.code.replace(/_/g, ' '),
      description: type.description || null,
      requiresFront: type.requiresFront,
      requiresBack: type.requiresBack,
      requiresPdf: type.requiresPdf,
      requiresExpiry: type.requiresExpiry,
      requiresDocNumber: type.requiresDocNumber,
      // Uploaded doc details (if any)
      id: doc?.id || null,
      documentNumber: doc?.documentNumber || null,
      frontUrl: doc?.frontUrl || null,
      backUrl: doc?.backUrl || null,
      pdfUrl: doc?.pdfUrl || null,
      expiryDate: doc?.expiryDate || null,
      status: doc ? doc.status : 'missing', // missing | pending | approved | rejected
      rejectionReason: doc?.rejectionReason || null,
      uploadedAt: doc?.uploadedAt || null,
      verifiedAt: doc?.verifiedAt || null,
    };
  });
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
      await publishNotification('DOCUMENT_REJECTED', {
        userId: doc.driverId, userType: 'driver',
        variables: { reason: rejectionReason || 'Please re-upload this document.' },
      });
    }
  }
  return doc;
}
