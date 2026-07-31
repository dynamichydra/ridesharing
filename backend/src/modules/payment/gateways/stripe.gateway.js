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
  supportsPayouts: true,

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

  // Stripe supports a real idempotency key as a request option — pass ours through so a
  // network-level retry of this same call can't create two PaymentIntents.
  async createOrder({ amountMinor, currencyCode, metadata, idempotencyKey }) {
    const intent = await client.paymentIntents.create({
      amount: amountMinor,
      currency: currencyCode.toLowerCase(),
      metadata: stringifyMetadata(metadata),
      automatic_payment_methods: { enabled: true },
    }, idempotencyKey ? { idempotencyKey: String(idempotencyKey) } : undefined);
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

  // Handles the two dispute lifecycle events that matter for the hold/resolve flow (created,
  // closed — confirmed against stripe/cjs/resources/Events.d.ts); `charge.dispute.updated`/
  // `funds_withdrawn`/`funds_reinstated` aren't handled — ingestion + hold + review queue
  // doesn't need them.
  parseWebhookEvent(rawBody, signature) {
    const event = client.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET || '');

    if (event.type === 'charge.dispute.created' || event.type === 'charge.dispute.closed') {
      const dispute = event.data.object;
      return {
        kind: 'dispute',
        gatewayDisputeId: dispute.id,
        gatewayPaymentId: dispute.payment_intent,
        amountMinor: dispute.amount,
        currencyCode: dispute.currency?.toUpperCase(),
        reason: dispute.reason,
        status: dispute.status,
        evidenceDueBy: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : null,
        eventId: event.id,
      };
    }

    // Payout reconciliation — driver payouts go out via client.transfers.create() (a Transfer
    // to the driver's Connect account), not the Payouts API, so the only async failure signal
    // is a transfer later being reversed (e.g. the connected account's payout to their real
    // bank bounced and Stripe pulled the funds back). Confirmed against
    // stripe/cjs/resources/Events.d.ts: 'transfer.reversed' fires on the platform account,
    // signed with the same secret as every other event handled by this function.
    if (event.type === 'transfer.reversed') {
      const transfer = event.data.object;
      return {
        kind: 'payout_status',
        gatewayPayoutId: transfer.id,
        status: transfer.reversed ? 'reversed' : 'processed',
        failureReason: 'Transfer reversed by Stripe',
        eventId: event.id,
      };
    }

    if (event.type !== 'payment_intent.succeeded') return null;
    const intent = event.data.object;
    return {
      kind: 'payment_captured',
      paymentRef: intent.id,
      orderRef: intent.id,
      metadata: intent.metadata,
      eventId: event.id, // Stripe webhook events carry a native unique id ("evt_...")
    };
  },

  // ── Dispute contest/accept ───────────────────────────────────────────────────
  // Confirmed against stripe/cjs/resources/Disputes.d.ts: `close()` tells Stripe the merchant
  // won't submit evidence (accepting the loss — closes the dispute, which then reports as
  // 'lost'); `update(id, { evidence, submit: true })` submits evidence for review (status
  // becomes 'under_review' until Stripe's decision, delivered later via the same
  // charge.dispute.* webhook already handled above).

  async acceptDispute({ gatewayDisputeId }) {
    const dispute = await client.disputes.close(gatewayDisputeId);
    return { status: dispute.status };
  },

  async submitDisputeEvidence({ gatewayDisputeId, evidence }) {
    const dispute = await client.disputes.update(gatewayDisputeId, { evidence, submit: true });
    return { status: dispute.status };
  },

  // amountMinor omitted -> full refund of the PaymentIntent.
  async refund({ gatewayPaymentId, amountMinor, idempotencyKey }) {
    const refund = await client.refunds.create({
      payment_intent: gatewayPaymentId,
      ...(amountMinor ? { amount: amountMinor } : {}),
    }, idempotencyKey ? { idempotencyKey: String(idempotencyKey) } : undefined);
    return { gatewayRefundId: refund.id, status: refund.status };
  },

  // Reconciliation source — Balance Transactions are Stripe's settlement-grade record (net of
  // fees). Confirmed against stripe/cjs/resources/BalanceTransactions.d.ts:
  // list({ created: { gte, lte }, type: 'charge' }) with SDK auto-pagination via `for await`.
  async listBalanceTransactions({ fromUnix, toUnix }) {
    const results = [];
    for await (const txn of client.balanceTransactions.list({
      created: { gte: fromUnix, lte: toUnix }, type: 'charge',
    })) {
      results.push({ gatewayPaymentId: txn.source, amountMinor: txn.amount, status: txn.status });
    }
    return results;
  },

  // ── Connect (payouts) ────────────────────────────────────────────────────────
  // Express accounts: Stripe hosts bank-detail collection and identity verification itself —
  // this backend never touches a driver's raw bank account number for the Stripe path.

  async createConnectedAccount({ email, countryCode }, idempotencyKey) {
    const account = await client.accounts.create({
      type: 'express',
      country: countryCode,
      email,
      capabilities: { transfers: { requested: true } },
    }, idempotencyKey ? { idempotencyKey: String(idempotencyKey) } : undefined);
    return { stripeAccountId: account.id };
  },

  async createOnboardingLink({ stripeAccountId, refreshUrl, returnUrl }) {
    const link = await client.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return { url: link.url };
  },

  async getAccountStatus({ stripeAccountId }) {
    const account = await client.accounts.retrieve(stripeAccountId);
    return { payoutsEnabled: account.payouts_enabled, detailsSubmitted: account.details_submitted };
  },

  // amountMinor is a snapshot of the driver's current wallet balance — see
  // payout.service.js runPayoutBatch.
  async payout({ stripeAccountId, amountMinor, currencyCode, idempotencyKey }) {
    const transfer = await client.transfers.create({
      amount: amountMinor,
      currency: currencyCode.toLowerCase(),
      destination: stripeAccountId,
    }, idempotencyKey ? { idempotencyKey: String(idempotencyKey) } : undefined);
    return { gatewayPayoutId: transfer.id };
  },

  // Connect events (account.updated etc.) arrive at a separate webhook endpoint from payment
  // events in Stripe's dashboard, signed with their own secret.
  verifyConnectWebhookSignature(rawBody, signature) {
    try {
      client.webhooks.constructEvent(rawBody, signature, env.STRIPE_CONNECT_WEBHOOK_SECRET || '');
      return true;
    } catch {
      return false;
    }
  },

  parseConnectWebhookEvent(rawBody, signature) {
    const event = client.webhooks.constructEvent(rawBody, signature, env.STRIPE_CONNECT_WEBHOOK_SECRET || '');
    if (event.type !== 'account.updated') return null;
    const account = event.data.object;
    return {
      stripeAccountId: account.id,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      eventId: event.id,
    };
  },
};
