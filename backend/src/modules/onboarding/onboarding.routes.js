import { sendSuccess, sendError, sendList, parsePagination } from '../../utils/response.js';
import { authenticateDriver, authenticateAdmin } from '../../middleware/authenticate.js';
import * as onboardingService from './onboarding.service.js';
import { getProfile } from '../driver/driver.service.js';

export async function onboardingRoutes(app) {

  // ── Driver-facing — one-shot config + resume state ───────────────────────────

  app.get('/config', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const driver = await getProfile(request.user.id);
    const data = await onboardingService.getOnboardingConfig(driver, request.query.lang);
    return sendSuccess(reply, data);
  });

  app.get('/state', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const driver = await getProfile(request.user.id);
    const data = await onboardingService.getOnboardingState(driver);
    return sendSuccess(reply, data);
  });

  // ── Driver-facing — questionnaire ────────────────────────────────────────────

  app.get('/questions', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const countryId = request.query.countryId || await onboardingService.getDriverCountryId(request.user.id);
    const lang = request.query.lang || 'en';
    const data = await onboardingService.getActiveQuestionnaire(countryId, lang);
    return sendSuccess(reply, data);
  });

  app.post('/answers', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { answers } = request.body;
    if (!Array.isArray(answers) || !answers.length) return sendError(reply, 'answers[] is required');
    const countryId = await onboardingService.getDriverCountryId(request.user.id);
    const data = await onboardingService.submitAnswers(request.user.id, countryId, answers);
    return sendSuccess(reply, data);
  });

  app.get('/answers/mine', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await onboardingService.getMyAnswers(request.user.id);
    return sendSuccess(reply, data);
  });

  // ── Driver-facing — legal documents ──────────────────────────────────────────

  app.get('/legal/:type', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const countryId = request.query.countryId || await onboardingService.getDriverCountryId(request.user.id);
    const data = await onboardingService.getActiveLegalDocument(request.params.type, countryId);
    if (!data) return sendError(reply, 'No active legal document of this type', 404);
    return sendSuccess(reply, data);
  });

  app.post('/legal/accept', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { legalDocumentId } = request.body;
    if (!legalDocumentId) return sendError(reply, 'legalDocumentId is required');
    const data = await onboardingService.acceptLegalDocument(
      request.user.id, legalDocumentId, request.ip, request.headers['user-agent'],
    );
    return sendSuccess(reply, data);
  });

  // ── Admin — question builder ─────────────────────────────────────────────────

  app.get('/admin/questions', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await onboardingService.listQuestionsPaginated(page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  app.post('/admin/questions', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { code, questionType } = request.body;
    if (!code || !questionType) return sendError(reply, 'code and questionType are required');
    const data = await onboardingService.createQuestion(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/admin/questions/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await onboardingService.updateQuestion(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/admin/questions/reorder', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { orderedIds } = request.body;
    if (!Array.isArray(orderedIds) || !orderedIds.length) return sendError(reply, 'orderedIds[] is required');
    const data = await onboardingService.reorderQuestions(orderedIds);
    return sendSuccess(reply, data);
  });

  app.post('/admin/questions/:id/options', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { code } = request.body;
    if (!code) return sendError(reply, 'code is required');
    const data = await onboardingService.createOption(request.params.id, request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/admin/options/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await onboardingService.updateOption(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.delete('/admin/options/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await onboardingService.removeOption(request.params.id);
    return sendSuccess(reply, data);
  });

  app.put('/admin/translations/:entityType/:entityId', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { items } = request.body;
    if (!Array.isArray(items) || !items.length) return sendError(reply, 'items[] is required');
    const data = await onboardingService.setTranslations(request.params.entityType, request.params.entityId, items);
    return sendSuccess(reply, data);
  });

  // ── Admin — legal documents ───────────────────────────────────────────────────

  app.get('/admin/legal', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await onboardingService.listLegalDocumentsPaginated(page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  app.post('/admin/legal', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { type, version, contentUrl, effectiveFrom } = request.body;
    if (!type || !version || !contentUrl || !effectiveFrom) {
      return sendError(reply, 'type, version, contentUrl and effectiveFrom are required');
    }
    const data = await onboardingService.publishLegalDocument(request.body);
    return sendSuccess(reply, data, 201);
  });
}
