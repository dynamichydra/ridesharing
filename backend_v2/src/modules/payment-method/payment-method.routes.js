import * as paymentMethodController from './payment-method.controller.js';
import { authenticateAny } from '../../middleware/authenticate.js';

export async function paymentMethodRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateAny);

  fastify.post('/setup', paymentMethodController.createSetupIntent);
  fastify.post('/attach', paymentMethodController.attachPaymentMethod);
  fastify.get('/', paymentMethodController.getPaymentMethods);
  fastify.post('/resolve-options', paymentMethodController.resolvePaymentOptions);
  fastify.patch('/:id/preferred', paymentMethodController.setPreferredPaymentMethod);
  fastify.post('/:id/preferred', paymentMethodController.setPreferredPaymentMethod);
  fastify.delete('/:id', paymentMethodController.deletePaymentMethod);
}
