import { sendSuccess, sendError, sendList, parsePagination } from '../../utils/response.js';
import { authenticateDriver, authenticateAdmin } from '../../middleware/authenticate.js';
import * as payoutAccountService from './payout-account.service.js';

export async function payoutAccountRoutes(app) {

  // ── Unified Driver-facing Multi-Gateway Setup ────────────────────────────────

  // GET /api/v1/payout-accounts/setup
  // Resolves the driver's country & gateway, returning the dynamic form schema or hosted URL
  app.get('/setup', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await payoutAccountService.getPayoutAccountSetup(request.user.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/payout-accounts/setup
  // Submits direct bank/UPI details or initiates hosted onboarding
  app.post('/setup', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await payoutAccountService.submitPayoutAccountSetup(request.user.id, request.body, {
      id: request.user.id,
      type: 'driver',
    });
    return sendSuccess(reply, data);
  });

  // ── Legacy Driver-facing ─────────────────────────────────────────────────────

  // POST /api/v1/payout-accounts/stripe/onboarding-link
  app.post('/stripe/onboarding-link', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await payoutAccountService.startStripeOnboarding(request.user.id);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/payout-accounts/mine
  app.get('/mine', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await payoutAccountService.getMyPayoutAccount(request.user.id);
    return sendSuccess(reply, data);
  });

  // Placeholder redirect targets for Stripe's hosted onboarding flow
  app.get('/stripe/onboarding-refresh', async (request, reply) => {
    return sendSuccess(reply, { message: 'Onboarding link expired — request a new one from the app.' });
  });
  app.get('/stripe/onboarding-return', async (request, reply) => {
    const { driverId } = request.query;
    if (driverId) {
      await payoutAccountService.approveMockStripeAccount(driverId);
    }
    return sendSuccess(reply, {
      message: 'Onboarding step complete — payout account has been verified and approved.',
      driverId,
      status: 'approved',
    });
  });

  // ── Dynamic Multi-Gateway Webhook Ingestion ──────────────────────────────────

  // POST /api/v1/payout-accounts/webhook/:gateway
  app.post('/webhook/:gateway', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const { gateway } = request.params;
    const signature = request.headers['stripe-signature'] || request.headers['x-razorpay-signature'];
    const raw = request.rawBody || JSON.stringify(request.body);
    const data = await payoutAccountService.handleGatewayWebhook(gateway, raw, signature);
    return sendSuccess(reply, data);
  });

  // ── Stripe Connect webhook ────────────────────────────────────────────────────

  // POST /api/v1/payout-accounts/webhook/stripe
  app.post('/webhook/stripe', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers['stripe-signature'];
    if (!signature) return sendError(reply, 'Missing signature', 400);
    const raw = request.rawBody || JSON.stringify(request.body);
    const data = await payoutAccountService.handleStripeConnectWebhook(raw, signature);
    return sendSuccess(reply, data);
  });

  // ── Admin ─────────────────────────────────────────────────────────────────────

  // GET /api/v1/payout-accounts?status=&page=&limit=
  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { status: request.query.status };
    const { rows, pagination } = await payoutAccountService.listPayoutAccounts(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // PATCH /api/v1/payout-accounts/:id/verify  { approve, rejectionReason? }
  app.patch('/:id/verify', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { approve, rejectionReason } = request.body;
    if (approve === undefined) return sendError(reply, 'approve (true/false) is required');
    if (!approve && !rejectionReason) return sendError(reply, 'rejectionReason is required when rejecting');
    const data = await payoutAccountService.verifyPayoutAccount(request.params.id, request.user.id, approve, rejectionReason);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/payout-accounts/drivers/:driverId/setup
  app.get('/drivers/:driverId/setup', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await payoutAccountService.getPayoutAccountSetup(request.params.driverId);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/payout-accounts/drivers/:driverId/setup
  app.post('/drivers/:driverId/setup', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await payoutAccountService.submitPayoutAccountSetup(request.params.driverId, request.body, {
      id: request.user.id,
      type: 'admin',
    });
    return sendSuccess(reply, data);
  });
}
