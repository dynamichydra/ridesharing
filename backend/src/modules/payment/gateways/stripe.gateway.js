import Stripe from 'stripe';
import { env, isStripeConfigured } from '../../../config/env.js';
import { fromMinor } from '../../../utils/money.js';

const client = isStripeConfigured ? new Stripe(env.STRIPE_SECRET_KEY) : null;

// Stripe metadata values must be strings — notes/metadata objects need stringifying.
function stringifyMetadata(metadata = {}) {
  return Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, String(v)]));
}

export const stripeGateway = {
  name: 'stripe',
  isConfigured: isStripeConfigured,

  async createPlan({ name, priceMinor, currencyCode, period, interval, metadata }) {
    const product = await client.products.create({ name, metadata: stringifyMetadata(metadata) });
    const price = await client.prices.create({
      product: product.id,
      unit_amount: priceMinor,
      currency: currencyCode.toLowerCase(),
      recurring: { interval: period === 'yearly' ? 'year' : 'month', interval_count: interval },
    });
    return { gatewayPlanId: price.id };
  },

  async createOrder({ amountMinor, currencyCode, metadata }) {
    const intent = await client.paymentIntents.create({
      amount: amountMinor,
      currency: currencyCode.toLowerCase(),
      metadata: stringifyMetadata(metadata),
      automatic_payment_methods: { enabled: true },
    });
    return {
      gateway: 'stripe',
      gatewayOrderId: intent.id,
      clientSecret: intent.client_secret, // client confirms the PaymentIntent with this
      amount: fromMinor(amountMinor, currencyCode),
      currency: currencyCode,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    };
  },

  // Stripe has no separate order/payment/signature triad — the client confirms the
  // PaymentIntent directly with Stripe, so verification is just re-checking its status.
  async verifyPayment({ orderRef }) {
    const intent = await client.paymentIntents.retrieve(orderRef);
    return intent.status === 'succeeded';
  },

  verifyWebhookSignature(rawBody, signature) {
    try {
      client.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET || '');
      return true;
    } catch {
      return false;
    }
  },

  parseWebhookEvent(rawBody, signature) {
    const event = client.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET || '');
    if (event.type !== 'payment_intent.succeeded') return null;
    const intent = event.data.object;
    return {
      paymentRef: intent.id,
      orderRef: intent.id,
      metadata: intent.metadata,
    };
  },
};
