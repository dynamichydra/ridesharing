import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateRider, authenticateAdmin } from '../../middleware/authenticate.js';
import * as promoService from './promo.service.js';

export async function promoRoutes(app) {

  // ── Rider — Validate Promo Code ─────────────────────────────────────────────
  // POST /api/v1/promos/validate
  app.post('/validate', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { code, fareMinor, countryId } = request.body || {};
    if (!code) return sendError(reply, 'code is required', 400);
    if (fareMinor == null) return sendError(reply, 'fareMinor is required', 400);

    const data = await promoService.validatePromoCode(code, fareMinor, request.user.id, countryId);
    return sendSuccess(reply, data);
  });

  // ── Rider — Referrals ────────────────────────────────────────────────────────
  // GET /api/v1/referrals/my-code
  app.get('/referrals/my-code', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await promoService.getMyReferralInfo(request.user.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/referrals/apply
  app.post('/referrals/apply', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { referralCode } = request.body || {};
    if (!referralCode) return sendError(reply, 'referralCode is required', 400);

    const data = await promoService.applyReferralCode(request.user.id, referralCode);
    return sendSuccess(reply, data, 201);
  });

  // ── Admin — Promo CRUD ───────────────────────────────────────────────────────
  // POST /api/v1/promos
  app.post('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await promoService.createPromo(request.body || {});
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/promos
  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      isActive: request.query.isActive,
      countryId: request.query.countryId,
    };
    const { rows, pagination } = await promoService.listPromos(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // PATCH /api/v1/promos/:id
  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await promoService.updatePromo(request.params.id, request.body || {});
    return sendSuccess(reply, data);
  });

  // DELETE /api/v1/promos/:id
  app.delete('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await promoService.deletePromo(request.params.id);
    return sendSuccess(reply, data);
  });
}
