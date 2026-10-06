import * as paymentMethodController from './payment-method.controller.js';
import { authenticateAny } from '../../middleware/authenticate.js';

export async function paymentMethodRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateAny);

  fastify.post('/setup', paymentMethodController.createSetupIntent);
  fastify.post('/attach', paymentMethodController.attachPaymentMethod);
  fastify.get('/', paymentMethodController.getPaymentMethods);
  fastify.delete('/:id', paymentMethodController.deletePaymentMethod);
}
