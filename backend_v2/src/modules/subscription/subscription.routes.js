import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateDriver, authenticateAdmin } from '../../middleware/authenticate.js';
import * as subService from './subscription.service.js';
import { receiveWebhookEvent } from '../../jobs/webhook-processing.job.js';
import { normalizePlanPayload } from './plan-validation.js';

export async function subscriptionRoutes(app) {

  // ── Public / Drivers ──────────────────────────────────────────────────────

  // GET /api/v1/subscriptions/plans?countryId=
  app.get('/plans', async (request, reply) => {
    const data = await subService.listPlans(true, request.query.countryId);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/subscriptions/initiate
  // Requires an Idempotency-Key header so a retried/double-submitted request returns the
  // original gateway order instead of creating a second charge attempt.
  app.post('/initiate', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { planId } = request.body;
    if (!planId) return sendError(reply, 'planId is required');
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) return sendError(reply, 'Idempotency-Key header is required', 400);
    const data = await subService.initiateSubscription(request.user.id, planId, idempotencyKey);
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
  // Verifies+parses synchronously (rejects bad signatures outright), then hands off to the
  // async webhook-processing job — see jobs/webhook-processing.job.js. Deduped by
  // (gateway, eventId, domain) so a processor redelivery is a no-op.
  app.post('/webhook/razorpay', {
    config: { rawBody: true }, // need raw body for HMAC
  }, async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'];
    if (!signature) return sendError(reply, 'Missing signature', 400);
    const raw = request.rawBody || JSON.stringify(request.body);
    const event = subService.parseAndVerifyWebhook('razorpay', raw, signature);
    await receiveWebhookEvent({ gatewayName: 'razorpay', domain: 'driver_subscription', rawBody: raw, event });
    return sendSuccess(reply, { received: true });
  });

  // POST /api/v1/subscriptions/webhook/stripe
  app.post('/webhook/stripe', {
    config: { rawBody: true }, // need raw body for Stripe's signature check
  }, async (request, reply) => {
    const signature = request.headers['stripe-signature'];
    if (!signature) return sendError(reply, 'Missing signature', 400);
    const raw = request.rawBody || JSON.stringify(request.body);
    const event = subService.parseAndVerifyWebhook('stripe', raw, signature);
    await receiveWebhookEvent({ gatewayName: 'stripe', domain: 'driver_subscription', rawBody: raw, event });
    return sendSuccess(reply, { received: true });
  });

  // ── Admin — plan management ───────────────────────────────────────────────

  app.get('/plans/all', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const isActive = request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined;
    const { rows, pagination } = await subService.listPlansPaginated(page, limit, offset, request.query.countryId, isActive);
    return sendList(reply, rows, pagination);
  });

  app.post('/plans', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { name, type, countryId, currencyCode, priceMinor } = request.body;
    if (!name || !type || !countryId || !currencyCode || !priceMinor) {
      return sendError(reply, 'name, type, countryId, currencyCode and priceMinor are required');
    }
    const payload = await normalizePlanPayload(request.body);
    const data = await subService.createPlan(payload);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/plans/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const payload = await normalizePlanPayload(request.body);
    const data = await subService.updatePlan(request.params.id, payload);
    return sendSuccess(reply, data);
  });

  app.patch('/plans/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await subService.setPlanActive(request.params.id, true, request.user.id);
    return sendSuccess(reply, data);
  });

  app.patch('/plans/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await subService.setPlanActive(request.params.id, false, request.user.id);
    return sendSuccess(reply, data);
  });

  // ── Admin — per-driver subscription/payment history ─────────────────────────

  // GET /api/v1/subscriptions/admin/drivers/:driverId/history
  app.get('/admin/drivers/:driverId/history', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await subService.getSubscriptionHistory(request.params.driverId, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // GET /api/v1/subscriptions/admin/drivers/:driverId/payments
  app.get('/admin/drivers/:driverId/payments', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await subService.getPaymentsForDriver(request.params.driverId, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // POST /api/v1/subscriptions/admin/drivers/:driverId/initiate (Admin purchase subscription on driver behalf)
  app.post('/admin/drivers/:driverId/initiate', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { planId } = request.body;
    if (!planId) return sendError(reply, 'planId is required');
    const idempotencyKey = request.headers['idempotency-key'] || `admin_sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const data = await subService.initiateSubscription(request.params.driverId, planId, idempotencyKey);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/subscriptions/admin/drivers/:driverId/verify (Admin verify subscription on driver behalf)
  app.post('/admin/drivers/:driverId/verify', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { planId, orderRef, paymentRef, signature } = request.body;
    if (!planId || !orderRef || !paymentRef) {
      return sendError(reply, 'planId, orderRef, paymentRef are required');
    }
    const data = await subService.verifyAndActivate(
      request.params.driverId, planId, orderRef, paymentRef, signature,
    );
    return sendSuccess(reply, data);
  });
}
