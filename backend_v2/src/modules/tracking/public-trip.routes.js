import { sendSuccess, sendError } from '../../utils/response.js';
import { getPublicTripTracking } from '../emergency/emergency.service.js';

export async function publicTripRoutes(app) {
  // GET /api/v1/public/trips/:token — Unauthenticated public live trip tracking
  app.get('/trips/:token', async (request, reply) => {
    const { token } = request.params;
    if (!token) return sendError(reply, 'Trip share token is required', 400);

    const data = await getPublicTripTracking(token);
    return sendSuccess(reply, data);
  });
}
