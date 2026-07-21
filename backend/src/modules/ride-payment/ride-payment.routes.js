import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateRider, authenticateDriver, authenticateAdmin, authenticateAny } from '../../middleware/authenticate.js';
import * as ridePaymentService from './ride-payment.service.js';

export async function ridePaymentRoutes(app) {

  // ── Rider — online payment ───────────────────────────────────────────────────

  // POST /api/v1/ride-payments/:rideId/initiate
  app.post('/:rideId/initiate', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await ridePaymentService.initiateRidePayment(request.user.id, request.params.rideId);
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

  // GET /api/v1/ride-payments/mine
  app.get('/mine', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await ridePaymentService.getMyRidePayments(request.user.id, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // ── Driver — cash payment ────────────────────────────────────────────────────

  // POST /api/v1/ride-payments/:rideId/cash-collect
  app.post('/:rideId/cash-collect', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await ridePaymentService.recordCashCollection(request.user.id, request.params.rideId);
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
  app.post('/webhook/razorpay', {
    config: { rawBody: true }, // need raw body for HMAC
  }, async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'];
    if (!signature) return sendError(reply, 'Missing signature', 400);
    const raw = request.rawBody || JSON.stringify(request.body);
    const data = await ridePaymentService.handleWebhook('razorpay', raw, signature);
    return sendSuccess(reply, data);
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
