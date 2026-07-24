import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateDriver } from '../../middleware/authenticate.js';
import * as bankAccountService from './bank-account.service.js';

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
