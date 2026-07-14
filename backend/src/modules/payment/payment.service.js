import { razorpayGateway } from './gateways/razorpay.gateway.js';
import { stripeGateway } from './gateways/stripe.gateway.js';

const GATEWAYS = {
  razorpay: razorpayGateway,
  stripe: stripeGateway,
};

// Which gateway serves which currency. Onboarding a country whose currency is already
// listed here is pure config elsewhere (country/pricing/plan rows) — this map only grows
// when a genuinely new currency needs a genuinely new gateway integration.
const CURRENCY_GATEWAY = {
  INR: 'razorpay',
  CAD: 'stripe',
};

export function getGateway(name) {
  const gateway = GATEWAYS[name];
  if (!gateway) throw { statusCode: 400, message: `Unknown payment gateway: ${name}` };
  return gateway;
}

/** Returns null (not a throw) when the mapped gateway has no keys configured yet — callers use this as the "dev mode, skip real payment" signal. */
export function gatewayForCurrency(currencyCode) {
  const name = CURRENCY_GATEWAY[currencyCode];
  if (!name) throw { statusCode: 400, message: `No payment gateway configured for currency ${currencyCode}` };
  const gateway = GATEWAYS[name];
  return gateway.isConfigured ? gateway : null;
}
