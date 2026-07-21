import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateRider, authenticateAdmin } from '../../middleware/authenticate.js';
import * as riderSubService from './rider-subscription.service.js';

export async function riderSubscriptionRoutes(app) {

  // ── Public / Riders ───────────────────────────────────────────────────────

  // GET /api/v1/rider-plans/plans?countryId=
  app.get('/plans', async (request, reply) => {
    const data = await riderSubService.listPlans(true, request.query.countryId);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rider-plans/initiate
  app.post('/initiate', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { planId } = request.body;
    if (!planId) return sendError(reply, 'planId is required');
    const data = await riderSubService.initiateSubscription(request.user.id, planId);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rider-plans/verify
  app.post('/verify', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { planId, orderRef, paymentRef, signature } = request.body;
    if (!planId || !orderRef || !paymentRef) {
      return sendError(reply, 'planId, orderRef, paymentRef are required');
    }
    const data = await riderSubService.verifyAndActivate(
      request.user.id, planId, orderRef, paymentRef, signature,
    );
    return sendSuccess(reply, data);
  });

  // GET /api/v1/rider-plans/mine
  app.get('/mine', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await riderSubService.getMySubscription(request.user.id);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/rider-plans/history
  app.get('/history', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await riderSubService.getSubscriptionHistory(request.user.id, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // POST /api/v1/rider-plans/webhook/razorpay
  app.post('/webhook/razorpay', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'];
    if (!signature) return sendError(reply, 'Missing signature', 400);
    const raw = request.rawBody || JSON.stringify(request.body);
    const data = await riderSubService.handleWebhook('razorpay', raw, signature);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rider-plans/webhook/stripe
  app.post('/webhook/stripe', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers['stripe-signature'];
    if (!signature) return sendError(reply, 'Missing signature', 400);
    const raw = request.rawBody || JSON.stringify(request.body);
    const data = await riderSubService.handleWebhook('stripe', raw, signature);
    return sendSuccess(reply, data);
  });

  // ── Admin — plan management ───────────────────────────────────────────────

  app.get('/plans/all', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const isActive = request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined;
    const { rows, pagination } = await riderSubService.listPlansPaginated(page, limit, offset, request.query.countryId, isActive);
    return sendList(reply, rows, pagination);
  });

  app.post('/plans', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { name, type, countryId, currencyCode, priceMinor } = request.body;
    if (!name || !type || !countryId || !currencyCode || !priceMinor) {
      return sendError(reply, 'name, type, countryId, currencyCode and priceMinor are required');
    }
    const data = await riderSubService.createPlan(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/plans/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await riderSubService.updatePlan(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/plans/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await riderSubService.setPlanActive(request.params.id, true, request.user.id);
    return sendSuccess(reply, data);
  });

  app.patch('/plans/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await riderSubService.setPlanActive(request.params.id, false, request.user.id);
    return sendSuccess(reply, data);
  });

  // ── Admin — per-rider subscription/payment history ───────────────────────

  // GET /api/v1/rider-plans/admin/riders/:riderId/history
  app.get('/admin/riders/:riderId/history', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await riderSubService.getSubscriptionHistory(request.params.riderId, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // GET /api/v1/rider-plans/admin/riders/:riderId/payments
  app.get('/admin/riders/:riderId/payments', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await riderSubService.getPaymentsForRider(request.params.riderId, page, limit, offset);
    return sendList(reply, rows, pagination);
  });
}
