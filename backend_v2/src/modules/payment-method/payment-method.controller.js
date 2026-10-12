import Stripe from 'stripe';
import * as pmService from './payment-method.service.js';
import { selectGateway, getGateway } from '../payment/payment.service.js';
import {
  resolvePaymentRegion,
  evaluatePaymentMethodEligibility,
  resolveCustomerPaymentOptions,
  getMerchantAccountId,
} from '../payment/payment-region.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { env, isStripeConfigured } from '../../config/env.js';

export async function createSetupIntent(request, reply) {
  try {
    const { gatewayName, currencyCode, countryCode, pickupLat, pickupLng, rideId } = request.body || {};

    // Authoritative resolution of region & merchant account
    const regionConfig = await resolvePaymentRegion({
      rideId,
      pickupLat,
      pickupLng,
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

    const user = request.user || {};
    const intentData = await gateway.createSetupIntent({
      email: user.email || 'guest@example.com',
      name: user.name || 'Guest User',
      phone: user.phone,
    });

    // Attach merchant account ID and region metadata
    intentData.merchantAccountId = regionConfig.primaryGateway?.merchantAccountId || getMerchantAccountId(gateway.name);
    intentData.region = regionConfig.region;
    intentData.currencyCode = regionConfig.currencyCode;

    return sendSuccess(reply, intentData);
  } catch (err) {
    return sendError(reply, err.message || 'Failed to create setup intent', err.statusCode || 500);
  }
}

export async function attachPaymentMethod(request, reply) {
  try {
    const userId = request.user?.id;
    const role = request.user?.role; // 'rider' or 'driver'
    let {
      gateway,
      gatewayCustomerId,
      paymentMethodToken,
      last4,
      cardBrand,
      expiryMonth,
      expiryYear,
      isDefault,
      fingerprint,
      merchantAccountId,
      billingCountry,
      cardType,
      metadata,
    } = request.body || {};

    if (!gateway || !paymentMethodToken) {
      return sendError(reply, 'Gateway and paymentMethodToken are required.', 400);
    }

    const normalizedGateway = gateway.toLowerCase();

    // Provider canonical identifier & metadata enrichment via Stripe SDK
    if (normalizedGateway === 'stripe' && isStripeConfigured && paymentMethodToken.startsWith('pm_')) {
      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        const pm = await stripe.paymentMethods.retrieve(paymentMethodToken);
        if (pm?.card) {
          cardBrand = cardBrand || pm.card.brand;
          last4 = last4 || pm.card.last4;
          expiryMonth = expiryMonth || String(pm.card.exp_month);
          expiryYear = expiryYear || String(pm.card.exp_year);
          fingerprint = fingerprint || pm.card.fingerprint;
          billingCountry = billingCountry || pm.card.country;
          cardType = cardType || pm.card.funding;
        }
      } catch (e) {
        // Non-blocking: proceed with client-supplied values in dev/test
      }
    }

    const resolvedMerchantAccount = merchantAccountId || getMerchantAccountId(normalizedGateway);

    const newMethod = await pmService.savePaymentMethod({
      userId: role === 'rider' ? userId : null,
      driverId: role === 'driver' ? userId : null,
      gateway: normalizedGateway,
      gatewayCustomerId: gatewayCustomerId || null,
      paymentMethodToken,
      last4: last4 ? String(last4).slice(-4) : '****',
      cardBrand: cardBrand || 'Card',
      expiryMonth: expiryMonth ? String(expiryMonth) : null,
      expiryYear: expiryYear ? String(expiryYear) : null,
      isDefault: isDefault === true,
      fingerprint: fingerprint || null,
      merchantAccountId: resolvedMerchantAccount,
      billingCountry: billingCountry || null,
      cardType: cardType || 'credit',
      metadata: metadata || null,
    });

    return sendSuccess(reply, newMethod);
  } catch (err) {
    return sendError(reply, err.message || 'Failed to attach payment method', err.statusCode || 500);
  }
}

export async function getPaymentMethods(request, reply) {
  try {
    const userId = request.user?.id;
    const role = request.user?.role;
    const query = request.query || {};

    // If transaction context is supplied, evaluate eligibility per method
    const hasContext = query.rideId || query.currencyCode || query.countryCode || query.pickupLat;
    if (hasContext && role === 'rider') {
      const options = await resolveCustomerPaymentOptions(userId, query);
      return sendSuccess(reply, options.savedMethods, 200, {
        region: options.region,
        currencyCode: options.currencyCode,
        availableGateways: options.availableGateways,
        customerPreferredMethodId: options.customerPreferredMethodId,
        preselectedMethodId: options.preselectedMethodId,
        preferredUnavailableNotice: options.preferredUnavailableNotice,
      });
    }

    // Default listing: list all active methods, annotated with default regional eligibility
    const defaultRegion = await resolvePaymentRegion({});
    const methods = await pmService.listPaymentMethods(userId, role);
    const annotated = methods.map((m) => {
      const eligibility = evaluatePaymentMethodEligibility(m, defaultRegion);
      return {
        ...m,
        isEligible: eligibility.isEligible,
        ineligibilityCode: eligibility.ineligibilityCode,
        ineligibilityReason: eligibility.ineligibilityReason,
        isPreferred: !!m.isDefault,
      };
    });

    return sendSuccess(reply, annotated);
  } catch (err) {
    return sendError(reply, err.message || 'Failed to fetch payment methods', err.statusCode || 500);
  }
}

export async function resolvePaymentOptions(request, reply) {
  try {
    const userId = request.user?.id;
    const context = request.body || {};
    const options = await resolveCustomerPaymentOptions(userId, context);
    return sendSuccess(reply, options);
  } catch (err) {
    return sendError(reply, err.message || 'Failed to resolve payment options', err.statusCode || 500);
  }
}

export async function setPreferredPaymentMethod(request, reply) {
  try {
    const userId = request.user?.id;
    const role = request.user?.role;
    const { id } = request.params;
    const updated = await pmService.setPreferredPaymentMethod(id, userId, role);
    return sendSuccess(reply, updated);
  } catch (err) {
    return sendError(reply, err.message || 'Failed to set preferred payment method', err.statusCode || 500);
  }
}

export async function deletePaymentMethod(request, reply) {
  try {
    const userId = request.user?.id;
    const role = request.user?.role;
    const { id } = request.params;
    await pmService.removePaymentMethod(id, userId, role);
    return sendSuccess(reply, 'Payment method removed');
  } catch (err) {
    return sendError(reply, err.message || 'Failed to delete payment method', err.statusCode || 500);
  }
}
