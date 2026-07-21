import { sendSuccess, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as walletService from './wallet.service.js';

export async function walletRoutes(app) {

  // ── Admin — global list across drivers + riders ─────────────────────────────

  // GET /api/v1/wallets?ownerType=&countryId=&stateId=&cityId=&search=&page=&limit=
  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      ownerType: request.query.ownerType,
      countryId: request.query.countryId,
      stateId:   request.query.stateId,
      cityId:    request.query.cityId,
      search:    request.query.search,
    };
    const { rows, pagination } = await walletService.listWallets(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // GET /api/v1/wallets/driver/:driverId — auto-creates a zero-balance wallet if none exists
  app.get('/driver/:driverId', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await walletService.getOrCreateWallet('driver', request.params.driverId);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/wallets/rider/:riderId — returns null if the rider has no wallet yet
  app.get('/rider/:riderId', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await walletService.getWallet('rider', request.params.riderId);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/wallets/:walletId/transactions
  app.get('/:walletId/transactions', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await walletService.listTransactions(request.params.walletId, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // POST /api/v1/wallets/driver/:driverId/adjust  { type, amountMinor, reason, description? }
  app.post('/driver/:driverId/adjust', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await walletService.adminAdjustWallet('driver', request.params.driverId, request.body, request.user.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/wallets/rider/:riderId/adjust  { type, amountMinor, reason, description? }
  app.post('/rider/:riderId/adjust', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await walletService.adminAdjustWallet('rider', request.params.riderId, request.body, request.user.id);
    return sendSuccess(reply, data);
  });
}
