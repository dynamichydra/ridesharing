import { and, eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { paymentMethods } from '../../../drizzle/schema/index.js';
import { getGateway } from '../payment/payment.service.js';
import { resolvePaymentRegion, evaluatePaymentMethodEligibility } from '../payment/payment-region.service.js';
import { ownerCondition } from './payment-method.service.js';

// Pseudo method ids the clients send for non-card tenders — never a payment_methods row.
const NON_CARD_METHOD_IDS = new Set(['cash', 'wallet', 'online', 'default']);

export function isSavedMethodId(paymentMethodId) {
  return !!paymentMethodId && !NON_CARD_METHOD_IDS.has(String(paymentMethodId).toLowerCase());
}

/**
 * Charges one of the payer's saved (tokenized) methods. Shared by every "pay with a saved
 * card" surface — ride fares, driver subscriptions, wallet top-ups and driver dues — so
 * ownership, region eligibility and the gateway call are enforced identically everywhere.
 *
 * Does NOT write a payments row or settle anything: the caller owns its domain bookkeeping
 * and decides what "succeeded" means (mark ride paid, activate subscription, credit wallet).
 *
 * `regionContext` is passed to resolvePaymentRegion — e.g. { rideId, riderId } for a fare,
 * or { countryId, currencyCode } for subscriptions/wallet — and the saved method is
 * re-validated against it, since the client's own eligibility check is untrusted.
 *
 * Returns { method, gateway, charge } where charge.status is 'succeeded' or
 * 'requires_action' (3DS for Stripe; Razorpay always needs the client to finish checkout
 * against the order — RBI rules require CVV/OTP for card-on-file payments).
 */
export async function chargeWithSavedMethod({
  ownerId,
  role,
  paymentMethodId,
  amountMinor,
  currencyCode,
  regionContext = {},
  metadata = {},
  idempotencyKey,
}) {
  const [method] = await db.select().from(paymentMethods)
    .where(and(
      eq(paymentMethods.id, paymentMethodId),
      ownerCondition(ownerId, role),
      eq(paymentMethods.isActive, true),
    ))
    .limit(1);

  if (!method) {
    throw { statusCode: 403, message: 'Invalid or unauthorized payment method' };
  }

  const regionConfig = await resolvePaymentRegion(regionContext);
  const eligibility = evaluatePaymentMethodEligibility(method, regionConfig);
  if (!eligibility.isEligible) {
    throw {
      statusCode: 400,
      code: 'PAYMENT_METHOD_INELIGIBLE',
      message: `Selected payment method cannot be used here: ${eligibility.ineligibilityReason}`,
    };
  }

  const gateway = getGateway(method.gateway);
  if (typeof gateway.chargeSavedMethod !== 'function') {
    throw { statusCode: 400, message: `Gateway ${gateway.name} does not support saved payment methods` };
  }

  const charge = await gateway.chargeSavedMethod({
    amountMinor,
    currencyCode,
    customerId: method.gatewayCustomerId,
    paymentMethodToken: method.paymentMethodToken,
    metadata: { ...metadata, paymentMethodId: method.id },
    idempotencyKey,
  });

  return { method, gateway, charge };
}

/**
 * Client-facing payload for a saved-method charge that still needs the payer to finish it on
 * the device. Deliberately has no `status` key — the driver app treats a `status` field on an
 * initiate response as "already active/paid".
 */
export function toActionRequiredResponse({ method, gateway, charge }, extra = {}) {
  return {
    gateway: gateway.name,
    requiresAction: true,
    paidWithSavedMethod: true,
    paymentMethodId: method.id,
    gatewayOrderId: charge.gatewayOrderId,
    gatewayCustomerId: charge.gatewayCustomerId || method.gatewayCustomerId || null,
    clientSecret: charge.clientSecret || null,
    publishableKey: charge.publishableKey || null,
    keyId: charge.keyId || null,
    amount: charge.amount,
    currency: charge.currency,
    ...extra,
  };
}
