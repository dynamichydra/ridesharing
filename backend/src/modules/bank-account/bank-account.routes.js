import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateDriver, authenticateAdmin } from '../../middleware/authenticate.js';
import * as bankAccountService from './bank-account.service.js';
import * as riderBankAccountService from './rider-bank-account.service.js';

export async function bankAccountRoutes(app) {

  // PUT /api/v1/driver/bank-details
  app.put('/', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { accountNumber, upiId, walletNumber } = request.body;
    if (!accountNumber && !upiId && !walletNumber) {
      return sendError(reply, 'accountNumber, upiId, or walletNumber is required');
    }
    const data = await bankAccountService.submitBankDetails(request.user.id, request.body);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/driver/bank-details
  app.get('/', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await bankAccountService.getMyBankDetails(request.user.id);
    return sendSuccess(reply, data);
  });
}

// Admin-on-behalf-of routes for both drivers and riders — mounted separately at
// `${PREFIX}/admin` (see server.js) so the path reads /admin/drivers/:id/bank-details and
// /admin/riders/:id/bank-details, alongside the self-service driver routes above.
export async function adminBankAccountRoutes(app) {

  // PUT /api/v1/admin/drivers/:driverId/bank-details
  app.put('/drivers/:driverId/bank-details', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { accountNumber, upiId, walletNumber } = request.body;
    if (!accountNumber && !upiId && !walletNumber) {
      return sendError(reply, 'accountNumber, upiId, or walletNumber is required');
    }
    const data = await bankAccountService.submitBankDetails(
      request.params.driverId, request.body, { id: request.user.id, type: 'admin' },
    );
    return sendSuccess(reply, data);
  });

  // GET /api/v1/admin/drivers/:driverId/bank-details
  app.get('/drivers/:driverId/bank-details', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await bankAccountService.getMyBankDetails(request.params.driverId);
    return sendSuccess(reply, data);
  });

  // PUT /api/v1/admin/riders/:riderId/bank-details
  app.put('/riders/:riderId/bank-details', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { accountNumber, upiId, walletNumber } = request.body;
    if (!accountNumber && !upiId && !walletNumber) {
      return sendError(reply, 'accountNumber, upiId, or walletNumber is required');
    }
    const data = await riderBankAccountService.submitRiderBankDetails(
      request.params.riderId, request.body, { id: request.user.id, type: 'admin' },
    );
    return sendSuccess(reply, data);
  });

  // GET /api/v1/admin/riders/:riderId/bank-details
  app.get('/riders/:riderId/bank-details', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await riderBankAccountService.getRiderBankDetails(request.params.riderId);
    return sendSuccess(reply, data);
  });

  // PATCH /api/v1/admin/riders/:riderId/bank-details/verify  { isVerified }
  app.patch('/riders/:riderId/bank-details/verify', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { isVerified } = request.body;
    if (typeof isVerified !== 'boolean') return sendError(reply, 'isVerified (boolean) is required');
    const data = await riderBankAccountService.setRiderBankVerified(request.params.riderId, isVerified);
    return sendSuccess(reply, data);
  });
}
