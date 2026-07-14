import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { env, isRazorpayConfigured } from '../../../config/env.js';
import { fromMinor } from '../../../utils/money.js';

const client = isRazorpayConfigured
  ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  : null;

export const razorpayGateway = {
  name: 'razorpay',
  isConfigured: isRazorpayConfigured,

  async createPlan({ name, priceMinor, currencyCode, period, interval, metadata }) {
    const rzPlan = await client.plans.create({
      period, interval,
      item: { name, amount: priceMinor, currency: currencyCode },
      notes: metadata,
    });
    return { gatewayPlanId: rzPlan.id };
  },

  async createOrder({ amountMinor, currencyCode, metadata }) {
    const order = await client.orders.create({
      amount: amountMinor,
      currency: currencyCode,
      notes: metadata,
    });
    return {
      gateway: 'razorpay',
      gatewayOrderId: order.id,
      amount: fromMinor(amountMinor, currencyCode),
      currency: currencyCode,
      keyId: env.RAZORPAY_KEY_ID, // client needs this to open Razorpay Checkout
    };
  },

  // orderRef/paymentRef/signature come straight from Razorpay's client-side checkout callback
  verifyPayment({ orderRef, paymentRef, signature }) {
    const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderRef}|${paymentRef}`).digest('hex');
    return expected === signature;
  },

  verifyWebhookSignature(rawBody, signature) {
    const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET || '')
      .update(rawBody).digest('hex');
    return expected === signature;
  },

  parseWebhookEvent(rawBody) {
    const event = JSON.parse(rawBody);
    if (event.event !== 'payment.captured') return null;
    const entity = event.payload.payment.entity;
    return {
      paymentRef: entity.id,
      orderRef: entity.order_id,
      metadata: entity.notes,
    };
  },
};
