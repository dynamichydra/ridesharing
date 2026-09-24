import { sendSuccess, sendError, sendList, parsePagination } from '../../utils/response.js';
import { authenticateDriver, authenticateAdmin, authenticateAny } from '../../middleware/authenticate.js';
import { uploadBuffer, createUploadUrl, keyToPublicUrl } from '../../utils/storage.js';
import * as docService from './documents.service.js';

export async function documentsRoutes(app) {

  // ── Driver-facing ────────────────────────────────────────────────────────────

  app.get('/types', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await docService.listDocumentTypes(true);
    return sendSuccess(reply, data);
  });

  app.get('/mine', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await docService.listMyDocuments(request.user.id);
    return sendSuccess(reply, data);
  });

  app.post('/:documentTypeId/upload-url', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { side, contentType } = request.body;
    if (!side || !contentType) return sendError(reply, 'side and contentType are required');
    const data = await docService.requestUploadUrl(request.user.id, request.params.documentTypeId, side, contentType);
    return sendSuccess(reply, data);
  });

  app.post('/:documentTypeId', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { side, key } = request.body;
    if (!side || !key) return sendError(reply, 'side and key are required');
    const data = await docService.confirmDocument(request.user.id, request.params.documentTypeId, request.body);
    return sendSuccess(reply, data, 202);
  });

  // ── Admin — document type config ─────────────────────────────────────────────

  app.get('/admin/types', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await docService.listDocumentTypesPaginated(page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  app.post('/admin/types', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { code } = request.body;
    if (!code) return sendError(reply, 'code is required');
    const data = await docService.createDocumentType(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/admin/types/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await docService.updateDocumentType(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.get('/admin/types/:id/requirements', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await docService.listRequirements(request.params.id);
    return sendSuccess(reply, data);
  });

  app.post('/admin/types/:id/requirements', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await docService.createRequirement({ ...request.body, documentTypeId: request.params.id });
    return sendSuccess(reply, data, 201);
  });

  app.delete('/admin/requirements/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await docService.removeRequirement(request.params.id);
    return sendSuccess(reply, data);
  });

  // ── Document File Upload Endpoint (Driver & Admin) ─────────────────────────
  app.post('/upload', { preHandler: [authenticateAny] }, async (request, reply) => {
    try {
      if (request.isMultipart()) {
        const file = await request.file();
        if (!file) return sendError(reply, 'No document file uploaded in multipart request');
        const buffer = await file.toBuffer();
        const mime = file.mimetype || 'application/octet-stream';
        const result = await uploadBuffer('driver-documents', mime, buffer);
        return sendSuccess(reply, {
          url: result.url,
          key: result.key,
        }, 201);
      }

      const { contentType = 'image/jpeg' } = request.body || {};
      const result = await createUploadUrl('driver-documents', contentType);
      return sendSuccess(reply, {
        uploadUrl: result.uploadUrl,
        key: result.key,
        url: keyToPublicUrl(result.key),
        expiresIn: result.expiresIn,
      });
    } catch (err) {
      return sendError(reply, err.message || 'Document upload failed', err.statusCode || 500);
    }
  });

  // ── Admin — driver document review & save ────────────────────────────────────

  app.get('/admin/drivers/:driverId', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await docService.listDriverDocuments(request.params.driverId);
    return sendSuccess(reply, data);
  });

  app.post('/admin/drivers/:driverId', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { documentTypeId } = request.body || {};
    if (!documentTypeId) return sendError(reply, 'documentTypeId is required');
    const data = await docService.adminSaveDriverDocument(request.params.driverId, request.body);
    return sendSuccess(reply, data, 201);
  });

  app.post('/admin/:docId/verify', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { approve, rejectionReason } = request.body;
    if (approve === undefined) return sendError(reply, 'approve (true/false) is required');
    if (!approve && !rejectionReason) return sendError(reply, 'rejectionReason is required when rejecting');
    const data = await docService.verifyDocument(request.params.docId, request.user.id, approve, rejectionReason);
    return sendSuccess(reply, data);
  });
}
