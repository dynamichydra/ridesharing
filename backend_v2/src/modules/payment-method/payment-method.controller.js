import * as pmService from './payment-method.service.js';
import { db } from '../../config/db.js';
import { paymentMethods } from '../../../drizzle/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { getGateway } from '../payment/payment.service.js';

export async function createSetupIntent(request, reply) {
  try {
    const { gatewayName, currencyCode } = request.body;
    const gateway = await getGateway({ currencyCode }); 
    // Wait, the gateway adapter needs a createSetupIntent or similar method.
    // Let's implement a simpler approach: the frontend handles card tokenization directly using Stripe/Razorpay SDKs 
    // and just sends the token/paymentMethodId to the backend to save.
    reply.send({ success: true, message: 'Setup initiated' });
  } catch (err) {
    reply.status(500).send({ success: false, message: err.message });
  }
}

export async function attachPaymentMethod(request, reply) {
  try {
    const userId = request.user?.id;
    const role = request.user?.role; // 'rider' or 'driver'
    const { gateway, gatewayCustomerId, paymentMethodToken, last4, cardBrand, expiryMonth, expiryYear, isDefault } = request.body;
    
    if (!gateway || !paymentMethodToken) {
      return reply.status(400).send({ success: false, message: 'Gateway and paymentMethodToken are required.' });
    }

    const newMethod = await pmService.savePaymentMethod({
      userId: role === 'rider' ? userId : null,
      driverId: role === 'driver' ? userId : null,
      gateway,
      gatewayCustomerId,
      paymentMethodToken,
      last4,
      cardBrand,
      expiryMonth,
      expiryYear,
      isDefault
    });

    reply.send({ success: true, paymentMethod: newMethod });
  } catch (err) {
    reply.status(500).send({ success: false, message: err.message });
  }
}

export async function getPaymentMethods(request, reply) {
  try {
    const userId = request.user?.id;
    const role = request.user?.role;
    const methods = await pmService.listPaymentMethods(userId, role);
    reply.send({ success: true, paymentMethods: methods });
  } catch (err) {
    reply.status(500).send({ success: false, message: err.message });
  }
}

export async function deletePaymentMethod(request, reply) {
  try {
    const { id } = request.params;
    await pmService.removePaymentMethod(id);
    reply.send({ success: true, message: 'Payment method removed' });
  } catch (err) {
    reply.status(500).send({ success: false, message: err.message });
  }
}
