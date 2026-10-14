import * as pmService from './payment-method.service.js';
import { selectGateway, getGateway } from '../payment/payment.service.js';
import {
  resolvePaymentRegion,
  resolveCustomerPaymentOptions,
  annotateSavedMethodsForProfile,
  getMerchantAccountId,
} from '../payment/payment-region.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

function payerRole(request) {
  const role = request.user?.role;
  if (role !== 'rider' && role !== 'driver') {
    throw { statusCode: 403, message: 'Only riders and drivers can manage saved payment methods' };
  }
  return role;
}

export async function createSetupIntent(request, reply) {
  try {
    const role = payerRole(request);
    const userId = request.user.id;
    const { gatewayName, currencyCode, countryCode, countryId, pickupLat, pickupLng, rideId } = request.body || {};

    // Authoritative resolution of region & merchant account
    const regionConfig = await resolvePaymentRegion({
      rideId,
      riderId: role === 'rider' ? userId : null,
      pickupLat,
      pickupLng,
      countryId,
      countryCode,
      currencyCode,
    });

    let gateway;
    if (gatewayName) {
      gateway = getGateway(gatewayName);
    } else if (regionConfig.primaryGateway) {
      gateway = getGateway(regionConfig.primaryGateway.gateway);
    } else {
      gateway = await selectGateway({ currencyCode: regionConfig.currencyCode });
    }

    if (!gateway) {
      return sendError(reply, `No available payment gateway for ${regionConfig.region.countryName} (${regionConfig.currencyCode})`, 400);
    }

    if (typeof gateway.createSetupIntent !== 'function') {
      return sendError(reply, `Gateway ${gateway.name} does not support setup intents`, 400);
    }

    const [contact, existingCustomerId] = await Promise.all([
      pmService.getPayerContact(userId, role),
      pmService.findGatewayCustomerId(userId, role, gateway.name),
    ]);

    const intentData = await gateway.createSetupIntent({ ...contact, customerId: existingCustomerId });

    // Attach merchant account ID and region metadata
    intentData.merchantAccountId = regionConfig.primaryGateway?.gateway === gateway.name
      ? regionConfig.primaryGateway.merchantAccountId
      : getMerchantAccountId(gateway.name);
    intentData.region = regionConfig.region;
    intentData.currencyCode = intentData.currencyCode || regionConfig.currencyCode;
    intentData.prefill = contact;

    return sendSuccess(reply, intentData);
  } catch (err) {
    return sendError(reply, err.message || 'Failed to create setup intent', err.statusCode || 500);
  }
}

// Body (Stripe):   { gateway: 'stripe', setupIntentId, gatewayCustomerId?, isDefault? }
// Body (Razorpay): { gateway: 'razorpay', gatewayCustomerId, razorpayPaymentId, razorpayOrderId,
//                    razorpaySignature, isDefault? }
// Card details are resolved from the gateway, never taken from the client.
export async function attachPaymentMethod(request, reply) {
  try {
    const role = payerRole(request);
    const userId = request.user.id;
    const { gateway, isDefault, merchantAccountId, ...rest } = request.body || {};

    if (!gateway) {
      return sendError(reply, 'gateway is required.', 400);
    }

    const gw = getGateway(gateway.toLowerCase());
    let resolved;
    if (typeof gw.resolveSavedMethod === 'function') {
      resolved = await gw.resolveSavedMethod(rest);
    } else {
      // Gateways without server-side lookup (mock) — client fields are all there is.
      if (!rest.paymentMethodToken) {
        return sendError(reply, 'paymentMethodToken is required for this gateway.', 400);
      }
      resolved = rest;
    }

    const newMethod = await pmService.savePaymentMethod({
      userId: role === 'rider' ? userId : null,
      driverId: role === 'driver' ? userId : null,
      gateway: gw.name,
      gatewayCustomerId: resolved.gatewayCustomerId || null,
      paymentMethodToken: resolved.paymentMethodToken,
      last4: resolved.last4 ? String(resolved.last4).slice(-4) : null,
      cardBrand: resolved.cardBrand || 'Card',
      expiryMonth: resolved.expiryMonth ? String(resolved.expiryMonth) : null,
      expiryYear: resolved.expiryYear ? String(resolved.expiryYear) : null,
      isDefault: isDefault === true,
      fingerprint: resolved.fingerprint || null,
      merchantAccountId: merchantAccountId || getMerchantAccountId(gw.name),
      billingCountry: resolved.billingCountry || null,
      cardType: resolved.cardType || 'credit',
      metadata: resolved.metadata || null,
    });

    return sendSuccess(reply, newMethod);
  } catch (err) {
    return sendError(reply, err.message || 'Failed to attach payment method', err.statusCode || 500);
  }
}

export async function getPaymentMethods(request, reply) {
  try {
    const role = payerRole(request);
    const userId = request.user.id;
    const query = request.query || {};

    // If transaction context is supplied, evaluate eligibility per method
    const hasContext = query.rideId || query.currencyCode || query.countryCode || query.countryId || query.pickupLat;
    if (hasContext) {
      const options = await resolveCustomerPaymentOptions(userId, query, role);
      return sendSuccess(reply, options.savedMethods, 200, {
        region: options.region,
        currencyCode: options.currencyCode,
        availableGateways: options.availableGateways,
        customerPreferredMethodId: options.customerPreferredMethodId,
        preselectedMethodId: options.preselectedMethodId,
        preferredUnavailableNotice: options.preferredUnavailableNotice,
      });
    }

    // Default listing for profile management: all active methods, only expired ones flagged.
    const methods = await pmService.listPaymentMethods(userId, role);
    return sendSuccess(reply, annotateSavedMethodsForProfile(methods));
  } catch (err) {
    return sendError(reply, err.message || 'Failed to fetch payment methods', err.statusCode || 500);
  }
}

export async function resolvePaymentOptions(request, reply) {
  try {
    const role = payerRole(request);
    const options = await resolveCustomerPaymentOptions(request.user.id, request.body || {}, role);
    return sendSuccess(reply, options);
  } catch (err) {
    return sendError(reply, err.message || 'Failed to resolve payment options', err.statusCode || 500);
  }
}

export async function setPreferredPaymentMethod(request, reply) {
  try {
    const role = payerRole(request);
    const updated = await pmService.setPreferredPaymentMethod(request.params.id, request.user.id, role);
    return sendSuccess(reply, updated);
  } catch (err) {
    return sendError(reply, err.message || 'Failed to set preferred payment method', err.statusCode || 500);
  }
}

export async function deletePaymentMethod(request, reply) {
  try {
    const role = payerRole(request);
    await pmService.removePaymentMethod(request.params.id, request.user.id, role);
    return sendSuccess(reply, 'Payment method removed');
  } catch (err) {
    return sendError(reply, err.message || 'Failed to delete payment method', err.statusCode || 500);
  }
}
