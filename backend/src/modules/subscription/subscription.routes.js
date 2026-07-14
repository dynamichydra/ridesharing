import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateDriver, authenticateAdmin } from '../../middleware/authenticate.js';
import * as subService from './subscription.service.js';

export async function subscriptionRoutes(app) {

  // ── Public / Drivers ──────────────────────────────────────────────────────

  // GET /api/v1/subscriptions/plans?countryId=
  app.get('/plans', async (request, reply) => {
    const data = await subService.listPlans(true, request.query.countryId);
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
  // orderRef/paymentRef/signature are gateway-neutral names — what they actually contain
  // depends on which gateway the plan's currency maps to (Razorpay order+payment+HMAC
  // signature, or a Stripe PaymentIntent id for both order/paymentRef with no signature).
  app.post('/verify', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { planId, orderRef, paymentRef, signature } = request.body;
    if (!planId || !orderRef || !paymentRef) {
      return sendError(reply, 'planId, orderRef, paymentRef are required');
    }
    const data = await subService.verifyAndActivate(
      request.user.id, planId, orderRef, paymentRef, signature,
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
    const data = await subService.handleWebhook('razorpay', raw, signature);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/subscriptions/webhook/stripe
  app.post('/webhook/stripe', {
    config: { rawBody: true }, // need raw body for Stripe's signature check
  }, async (request, reply) => {
    const signature = request.headers['stripe-signature'];
    if (!signature) return sendError(reply, 'Missing signature', 400);
    const raw = request.rawBody || JSON.stringify(request.body);
    const data = await subService.handleWebhook('stripe', raw, signature);
    return sendSuccess(reply, data);
  });

  // ── Admin — plan management ───────────────────────────────────────────────

  app.get('/plans/all', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await subService.listPlansPaginated(page, limit, offset, request.query.countryId);
    return sendList(reply, rows, pagination);
  });

  app.post('/plans', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { name, type, countryId, currencyCode, priceMinor } = request.body;
    if (!name || !type || !countryId || !currencyCode || !priceMinor) {
      return sendError(reply, 'name, type, countryId, currencyCode and priceMinor are required');
    }
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
