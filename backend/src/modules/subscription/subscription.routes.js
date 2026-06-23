import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateDriver, authenticateAdmin } from '../../middleware/authenticate.js';
import * as subService from './subscription.service.js';

export async function subscriptionRoutes(app) {

  // ── Public / Drivers ──────────────────────────────────────────────────────

  // GET /api/v1/subscriptions/plans
  app.get('/plans', async (request, reply) => {
    const data = await subService.listPlans(true);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/subscriptions/initiate
  app.post('/initiate', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { planId } = request.body;
    if (!planId) return sendError(reply, 'planId is required');
    const data = await subService.initiateSubscription(request.user.id, planId);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/subscriptions/verify
  app.post('/verify', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { planId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = request.body;
    if (!planId || !razorpayOrderId || !razorpayPaymentId) {
      return sendError(reply, 'planId, razorpayOrderId, razorpayPaymentId are required');
    }
    const data = await subService.verifyAndActivate(
      request.user.id, planId, razorpayOrderId, razorpayPaymentId, razorpaySignature,
    );
    return sendSuccess(reply, data);
  });

  // GET /api/v1/subscriptions/mine
  app.get('/mine', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await subService.getMySubscription(request.user.id);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/subscriptions/history
  app.get('/history', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await subService.getSubscriptionHistory(request.user.id, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // POST /api/v1/subscriptions/webhook/razorpay
  app.post('/webhook/razorpay', {
    config: { rawBody: true }, // need raw body for HMAC
  }, async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'];
    if (!signature) return sendError(reply, 'Missing signature', 400);
    const raw = request.rawBody || JSON.stringify(request.body);
    const data = await subService.handleRazorpayWebhook(raw, signature);
    return sendSuccess(reply, data);
  });

  // ── Admin — plan management ───────────────────────────────────────────────

  app.get('/plans/all', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await subService.listPlansPaginated(page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  app.post('/plans', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { name, type, price } = request.body;
    if (!name || !type || !price) return sendError(reply, 'name, type and price are required');
    const data = await subService.createPlan(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/plans/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await subService.updatePlan(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.delete('/plans/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await subService.deletePlan(request.params.id);
    return sendSuccess(reply, data);
  });
}
