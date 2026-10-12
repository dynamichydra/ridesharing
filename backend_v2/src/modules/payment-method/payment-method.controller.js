import * as pmService from './payment-method.service.js';
import { selectGateway, getGateway } from '../payment/payment.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export async function createSetupIntent(request, reply) {
  try {
    const { gatewayName, currencyCode } = request.body;
    let gateway;
    if (gatewayName) {
      gateway = getGateway(gatewayName);
    } else {
      gateway = await selectGateway({ currencyCode });
    }

    if (!gateway) {
      return sendError(reply, 'No available payment gateway for this currency', 400);
    }

    if (typeof gateway.createSetupIntent !== 'function') {
      return sendError(reply, `Gateway ${gateway.name} does not support setup intents`, 400);
    }

    const user = request.user || {};
    const intentData = await gateway.createSetupIntent({
      email: user.email || 'guest@example.com',
      name: user.name || 'Guest User',
      phone: user.phone,
    });

    return sendSuccess(reply, intentData);
  } catch (err) {
    return sendError(reply, err.message || 'Failed to create setup intent', 500);
  }
}

export async function attachPaymentMethod(request, reply) {
  try {
    const userId = request.user?.id;
    const role = request.user?.role; // 'rider' or 'driver'
    const { gateway, gatewayCustomerId, paymentMethodToken, last4, cardBrand, expiryMonth, expiryYear, isDefault } = request.body;

    if (!gateway || !paymentMethodToken) {
      return sendError(reply, 'Gateway and paymentMethodToken are required.', 400);
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
      isDefault,
    });

    return sendSuccess(reply, newMethod);
  } catch (err) {
    return sendError(reply, err.message || 'Failed to attach payment method', 500);
  }
}

export async function getPaymentMethods(request, reply) {
  try {
    const userId = request.user?.id;
    const role = request.user?.role;
    const methods = await pmService.listPaymentMethods(userId, role);
    // Return as list via MESSAGE so the Flutter datasource can read data['MESSAGE']
    return sendSuccess(reply, methods);
  } catch (err) {
    return sendError(reply, err.message || 'Failed to fetch payment methods', 500);
  }
}

export async function deletePaymentMethod(request, reply) {
  try {
    const { id } = request.params;
    await pmService.removePaymentMethod(id);
    return sendSuccess(reply, 'Payment method removed');
  } catch (err) {
    return sendError(reply, err.message || 'Failed to delete payment method', 500);
  }
}
