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
  supportsPayouts: false,

  async createPlan({ name, priceMinor, currencyCode, period, interval, metadata }) {
    const rzPlan = await client.plans.create({
      period, interval,
      item: { name, amount: priceMinor, currency: currencyCode },
      notes: metadata,
    });
    return { gatewayPlanId: rzPlan.id };
  },

  // Razorpay's Orders API has no Stripe-style idempotency-key request option — `receipt`
  // gives best-effort dedup within Razorpay's own window (40-char limit), not a real
  // guarantee. Our own idempotency_keys table (see utils/idempotency.js) is the
  // authoritative exactly-once guard; don't rely on this alone.
  async createOrder({ amountMinor, currencyCode, metadata, idempotencyKey }) {
    const order = await client.orders.create({
      amount: amountMinor,
      currency: currencyCode,
      notes: metadata,
      ...(idempotencyKey ? { receipt: String(idempotencyKey).slice(0, 40) } : {}),
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

    // Best-effort — Razorpay's dispute webhook event names/payload shape aren't enumerated
    // anywhere in the installed SDK's types (webhooks.d.ts types the payload as `any`); this
    // follows Razorpay's documented `payload.<entity>.entity` convention (confirmed for
    // `payment.captured` below) but has not been verified against a live dispute webhook.
    // Confirm against Razorpay's dashboard/docs before relying on this in production.
    if (event.event && event.event.startsWith('payment.dispute.')) {
      const entity = event.payload?.dispute?.entity;
      if (!entity) return null;
      return {
        kind: 'dispute',
        gatewayDisputeId: entity.id,
        gatewayPaymentId: entity.payment_id,
        amountMinor: entity.amount,
        currencyCode: entity.currency,
        reason: entity.reason_code,
        status: entity.status,
        evidenceDueBy: entity.respond_by ? new Date(entity.respond_by * 1000) : null,
        eventId: `${event.event}:${entity.id}`,
      };
    }

    if (event.event !== 'payment.captured') return null;
    const entity = event.payload.payment.entity;
    return {
      kind: 'payment_captured',
      paymentRef: entity.id,
      orderRef: entity.order_id,
      metadata: entity.notes,
      // Razorpay webhook payloads have no reliable top-level unique id — synthesize one from
      // the event type + payment id for dedup (see webhook_events schema).
      eventId: `${event.event}:${entity.id}`,
    };
  },

  // amountMinor omitted -> full refund of whatever remains capturable on the payment.
  async refund({ gatewayPaymentId, amountMinor, idempotencyKey }) {
    const refund = await client.payments.refund(gatewayPaymentId, {
      amount: amountMinor,
      speed: 'normal',
      ...(idempotencyKey ? { receipt: String(idempotencyKey).slice(0, 40) } : {}),
    });
    return { gatewayRefundId: refund.id, status: refund.status };
  },

  // Reconciliation source — paginates until a page comes back short of `count`. Confirmed
  // against razorpay/dist/types/payments.d.ts: payments.all({ from, to, count, skip }) returns
  // { items: RazorpayPayment[] }, unix-second `from`/`to`.
  async listCapturedPayments({ fromUnix, toUnix }) {
    const results = [];
    const count = 100;
    let skip = 0;
    for (;;) {
      const page = await client.payments.all({ from: fromUnix, to: toUnix, count, skip });
      for (const p of page.items) {
        if (p.status === 'captured' || p.status === 'refunded') {
          results.push({ gatewayPaymentId: p.id, amountMinor: p.amount, status: p.status });
        }
      }
      if (page.items.length < count) break;
      skip += count;
    }
    return results;
  },

  // NOT IMPLEMENTED — RazorpayX Payouts (Contacts/FundAccounts/Payouts) is not present in the
  // installed `razorpay` package (v2.9.6 — confirmed via razorpay/dist/razorpay.d.ts, which
  // lists every resource the client exposes and has none of these). Building it would mean raw
  // HTTP calls through the SDK's api.post() escape hatch to endpoints this codebase has no way
  // to verify field-by-field. Throws rather than silently no-opping so a caller can never
  // mistake this for a successful (or even attempted) payout — see supportsPayouts: false above,
  // which is what payout.service.js actually checks before ever reaching this method.
  async payout() {
    throw {
      statusCode: 501,
      message: 'RazorpayX payouts are not implemented — verify the RazorpayX Payouts API against a real account before building this.',
    };
  },
};
