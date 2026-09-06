import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateRider, authenticateDriver, authenticateAdmin, authenticateAny } from '../../middleware/authenticate.js';
import * as ridePaymentService from './ride-payment.service.js';
import { receiveWebhookEvent } from '../../jobs/webhook-processing.job.js';

export async function ridePaymentRoutes(app) {

  // ── Rider — online payment ───────────────────────────────────────────────────

  // POST /api/v1/ride-payments/:rideId/initiate
  // Requires an Idempotency-Key header so a retried/double-submitted request returns the
  // original gateway order instead of creating a second charge attempt.
  app.post('/:rideId/initiate', { preHandler: [authenticateRider] }, async (request, reply) => {
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) return sendError(reply, 'Idempotency-Key header is required', 400);
    const data = await ridePaymentService.initiateRidePayment(request.user.id, request.params.rideId, idempotencyKey);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/ride-payments/:rideId/verify
  // orderRef/paymentRef/signature are gateway-neutral names — see subscription.routes.js
  app.post('/:rideId/verify', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { orderRef, paymentRef, signature } = request.body;
    if (!orderRef || !paymentRef) return sendError(reply, 'orderRef and paymentRef are required');
    const data = await ridePaymentService.verifyRidePayment(
      request.user.id, request.params.rideId, orderRef, paymentRef, signature,
    );
    return sendSuccess(reply, data);
  });

  // POST /api/v1/ride-payments/:rideId/pay-wallet
  app.post('/:rideId/pay-wallet', { preHandler: [authenticateRider] }, async (request, reply) => {
    const idempotencyKey = request.headers['idempotency-key'];
    const data = await ridePaymentService.payRideWithWallet(
      request.user.id, request.params.rideId, idempotencyKey,
    );
    return sendSuccess(reply, data);
  });

  // GET /api/v1/ride-payments/mine
  app.get('/mine', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await ridePaymentService.getMyRidePayments(request.user.id, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // ── Fare Split ───────────────────────────────────────────────────────────────

  // POST /api/v1/ride-payments/:rideId/fare-split/invite
  app.post('/:rideId/fare-split/invite', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { phone } = request.body || {};
    if (!phone) return sendError(reply, 'phone is required', 400);
    const data = await ridePaymentService.inviteToFareSplit(request.params.rideId, request.user.id, phone);
    return sendSuccess(reply, data, 201);
  });

  // POST /api/v1/ride-payments/:rideId/fare-split/respond
  app.post('/:rideId/fare-split/respond', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { accept } = request.body || {};
    if (accept === undefined) return sendError(reply, 'accept is required (true/false)', 400);
    const data = await ridePaymentService.respondToFareSplit(request.params.rideId, request.user.id, accept);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/ride-payments/:rideId/fare-split/cancel
  app.post('/:rideId/fare-split/cancel', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { splitId } = request.body || {};
    if (!splitId) return sendError(reply, 'splitId is required', 400);
    const data = await ridePaymentService.cancelFareSplitInvite(request.params.rideId, request.user.id, splitId);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/ride-payments/:rideId/fare-split/pay-wallet
  app.post('/:rideId/fare-split/pay-wallet', { preHandler: [authenticateRider] }, async (request, reply) => {
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) return sendError(reply, 'Idempotency-Key header is required', 400);
    const data = await ridePaymentService.payFareSplitWithWallet(request.params.rideId, request.user.id, idempotencyKey);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/ride-payments/:rideId/fare-split
  app.get('/:rideId/fare-split', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await ridePaymentService.getRideFareSplits(request.params.rideId, request.user.id);
    return sendSuccess(reply, data);
  });


  // ── Driver — cash payment ────────────────────────────────────────────────────

  // POST /api/v1/ride-payments/:rideId/cash-collect
  app.post('/:rideId/cash-collect', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await ridePaymentService.recordCashCollection(
      request.user.id,
      request.params.rideId,
      request.body?.collectedAmountMinor
    );
    return sendSuccess(reply, data);
  });

  // ── Shared read — rider/driver (own ride) or admin (any ride) ────────────────

  // GET /api/v1/ride-payments/:rideId
  app.get('/:rideId', { preHandler: [authenticateAny] }, async (request, reply) => {
    const data = await ridePaymentService.getRidePaymentStatus(request.params.rideId, request.user);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/ride-payments/:rideId/invoice
  app.get('/:rideId/invoice', { preHandler: [authenticateAny] }, async (request, reply) => {
    const data = await ridePaymentService.getRideInvoice(request.params.rideId, request.user);
    return sendSuccess(reply, data);
  });

  // ── Gateway webhook ───────────────────────────────────────────────────────────

  // POST /api/v1/ride-payments/webhook/razorpay
  // Verifies+parses synchronously (rejects bad signatures outright), then hands off to the
  // async webhook-processing job — see jobs/webhook-processing.job.js. Deduped by
  // (gateway, eventId, domain) so a processor redelivery is a no-op.
  app.post('/webhook/razorpay', {
    config: { rawBody: true }, // need raw body for HMAC
  }, async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'];
    if (!signature) return sendError(reply, 'Missing signature', 400);
    const raw = request.rawBody || JSON.stringify(request.body);
    const event = ridePaymentService.parseAndVerifyWebhook('razorpay', raw, signature);
    await receiveWebhookEvent({ gatewayName: 'razorpay', domain: 'ride_payment', rawBody: raw, event });
    return sendSuccess(reply, { received: true });
  });

  // POST /api/v1/ride-payments/webhook/stripe
  // Backstop for CAD ride-fare payments — same shape as the subscription domain's Stripe
  // webhook. Without this, a CAD ride payment relied entirely on the client's /verify call.
  app.post('/webhook/stripe', {
    config: { rawBody: true }, // need raw body for Stripe's signature check
  }, async (request, reply) => {
    const signature = request.headers['stripe-signature'];
    if (!signature) return sendError(reply, 'Missing signature', 400);
    const raw = request.rawBody || JSON.stringify(request.body);
    const event = ridePaymentService.parseAndVerifyWebhook('stripe', raw, signature);
    await receiveWebhookEvent({ gatewayName: 'stripe', domain: 'ride_payment', rawBody: raw, event });
    return sendSuccess(reply, { received: true });
  });

  // ── Admin ─────────────────────────────────────────────────────────────────────

  // GET /api/v1/ride-payments
  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      status: request.query.status,
      gateway: request.query.gateway,
      paymentMethod: request.query.paymentMethod,
      countryId: request.query.countryId,
      riderId: request.query.riderId,
      driverId: request.query.driverId,
      rideId: request.query.rideId,
    };
    const { rows, pagination } = await ridePaymentService.listRidePaymentsAdmin(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });
}
