import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateRider } from '../../middleware/authenticate.js';
import * as savedPlaceService from './saved-place.service.js';

export async function savedPlaceRoutes(app) {

  // POST /api/v1/saved-places
  app.post('/', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await savedPlaceService.upsertSavedPlace(request.user.id, request.body || {});
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/saved-places
  app.get('/', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await savedPlaceService.listSavedPlaces(request.user.id);
    return sendSuccess(reply, data);
  });

  // PATCH /api/v1/saved-places/:id
  app.patch('/:id', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await savedPlaceService.updateSavedPlace(request.user.id, request.params.id, request.body || {});
    return sendSuccess(reply, data);
  });

  // DELETE /api/v1/saved-places/:id
  app.delete('/:id', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await savedPlaceService.deleteSavedPlace(request.user.id, request.params.id);
    return sendSuccess(reply, data);
  });
}
