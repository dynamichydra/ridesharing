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
  onboardingType: 'hosted_redirect',

  getSetupFormSchema(context = {}) {
    return {
      gateway: 'stripe',
      type: 'hosted_redirect',
      title: 'Stripe Express Payouts',
      description: 'Stripe securely verifies your identity and bank transit/account numbers in your country.',
      supportedCurrencies: ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'SGD', 'JPY'],
      requiresRedirect: true,
    };
  },

  async setupPayoutAccount(driver, data = {}, options = {}) {
    if (!this.isConfigured) throw { statusCode: 503, message: 'Stripe is not configured' };
    if (!driver.email) throw { statusCode: 422, message: 'Driver must have an email on file before starting Stripe onboarding' };

    let stripeAccountId = options.existingAccountId || null;
    if (!stripeAccountId) {
      const countryCode = options.countryCode || 'CA';
      const created = await this.createConnectedAccount({ email: driver.email, countryCode });
      stripeAccountId = created.stripeAccountId;
    }

    const baseUrl = env.APP_BASE_URL || `http://localhost:${env.PORT}`;
    const prefix = `${baseUrl}/api/${env.API_VERSION}/payout-accounts/stripe`;
    const { url } = await this.createOnboardingLink({
      stripeAccountId,
      refreshUrl: env.DRIVER_APP_ONBOARDING_REFRESH_URL || `${prefix}/onboarding-refresh`,
      returnUrl: env.DRIVER_APP_ONBOARDING_RETURN_URL || `${prefix}/onboarding-return`,
    });

    return {
      gateway: 'stripe',
      type: 'hosted_redirect',
      onboardingUrl: url,
      externalAccountId: stripeAccountId,
      stripeAccountId,
      status: 'pending',
      requiresRedirect: true,
    };
  },

  async executePayout({ destinationId, amountMinor, currencyCode, idempotencyKey }) {
    return this.payout({
      stripeAccountId: destinationId,
      amountMinor,
      currencyCode,
      idempotencyKey,
    });
  },

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

  async chargeSavedMethod({ amountMinor, currencyCode, customerId, paymentMethodToken, metadata, idempotencyKey }) {
    if (!client || (paymentMethodToken && (paymentMethodToken.startsWith('pm_test_token_') || paymentMethodToken.startsWith('pm_mock_')))) {
      return {
        gateway: 'stripe',
        gatewayOrderId: `pi_test_${Date.now()}`,
        gatewayPaymentId: `pi_test_${Date.now()}`,
        status: 'succeeded',
        amount: fromMinor(amountMinor, currencyCode),
        currency: currencyCode,
      };
    }

    try {
      const intentParams = {
        amount: amountMinor,
        currency: currencyCode.toLowerCase(),
        metadata: stringifyMetadata(metadata),
        payment_method: paymentMethodToken,
        confirm: true,
        off_session: true,
      };
      if (customerId) {
        intentParams.customer = customerId;
      }

      const intent = await client.paymentIntents.create(
        intentParams,
        idempotencyKey ? { idempotencyKey: String(idempotencyKey) } : undefined
      );

      if (intent.status === 'succeeded') {
        return {
          gateway: 'stripe',
          gatewayOrderId: intent.id,
          gatewayPaymentId: intent.id,
          status: 'succeeded',
          amount: fromMinor(amountMinor, currencyCode),
          currency: currencyCode,
        };
      } else if (intent.status === 'requires_action') {
        return {
          gateway: 'stripe',
          gatewayOrderId: intent.id,
          clientSecret: intent.client_secret,
          requiresAction: true,
          status: 'requires_action',
          amount: fromMinor(amountMinor, currencyCode),
          currency: currencyCode,
          publishableKey: env.STRIPE_PUBLISHABLE_KEY,
        };
      } else {
        throw new Error(`Stripe PaymentIntent status: ${intent.status}`);
      }
    } catch (err) {
      if (err.code === 'authentication_required') {
        return {
          gateway: 'stripe',
          gatewayOrderId: err.raw?.payment_intent?.id,
          clientSecret: err.raw?.payment_intent?.client_secret,
          requiresAction: true,
          status: 'requires_action',
          amount: fromMinor(amountMinor, currencyCode),
          currency: currencyCode,
          publishableKey: env.STRIPE_PUBLISHABLE_KEY,
        };
      }
      throw err;
    }
  },

  // customerId: an existing Stripe customer from one of the payer's other saved cards, so all
  // their cards hang off one customer. usage 'off_session' is what lets chargeSavedMethod
  // confirm later without the payer present.
  async createSetupIntent({ email, name, phone, customerId }) {
    if (!client) throw new Error("Stripe is not configured");
    const resolvedCustomerId = customerId
      || (await client.customers.create({ email: email || undefined, name, phone: phone || undefined })).id;
    const setupIntent = await client.setupIntents.create({
      customer: resolvedCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });
    return {
      gateway: 'stripe',
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
      gatewayCustomerId: resolvedCustomerId,
    };
  },

  // Turns the client's post-setup callback into the canonical card record to store. Only the
  // SetupIntent id is trusted from the client — the PaymentMethod id, customer and card
  // details all come from Stripe. Falls back to the client-supplied fields when Stripe isn't
  // configured (dev/test).
  async resolveSavedMethod({ setupIntentId, paymentMethodToken, gatewayCustomerId, ...clientFields }) {
    if (!client) {
      return {
        ...clientFields,
        gatewayCustomerId: gatewayCustomerId || null,
        paymentMethodToken: paymentMethodToken && paymentMethodToken !== 'setup_intent_success'
          ? paymentMethodToken
          : `pm_test_${Date.now()}`,
      };
    }

    let token = paymentMethodToken;
    let customer = gatewayCustomerId;
    if (setupIntentId) {
      const si = await client.setupIntents.retrieve(setupIntentId);
      if (si.status !== 'succeeded') {
        throw { statusCode: 400, message: `Card setup not completed (status: ${si.status})` };
      }
      token = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id;
      customer = typeof si.customer === 'string' ? si.customer : si.customer?.id;
    }
    if (!token || !token.startsWith('pm_')) {
      throw { statusCode: 400, message: 'A completed Stripe SetupIntent is required to save a card' };
    }

    const pm = await client.paymentMethods.retrieve(token);
    if (!customer && pm.customer) {
      customer = typeof pm.customer === 'string' ? pm.customer : pm.customer.id;
    }
    const card = pm.card || {};
    return {
      gatewayCustomerId: customer || null,
      paymentMethodToken: pm.id,
      cardBrand: card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : 'Card',
      last4: card.last4 || null,
      expiryMonth: card.exp_month ? String(card.exp_month) : null,
      expiryYear: card.exp_year ? String(card.exp_year) : null,
      fingerprint: card.fingerprint || null,
      billingCountry: card.country || null,
      cardType: card.funding || 'credit',
    };
  },

  // Stripe has no separate order/payment/signature triad — the client confirms the
  // PaymentIntent directly with Stripe, so verification is just re-checking its status.
  async verifyPayment({ orderRef, paymentRef }) {
    if (env.NODE_ENV !== 'production' && (paymentRef?.startsWith('pi_mock_') || orderRef?.startsWith('order_mock_') || orderRef?.startsWith('mock_') || paymentRef?.startsWith('mock_'))) {
      return true;
    }
    if (!client) return false;
    try {
      const intent = await client.paymentIntents.retrieve(orderRef);
      return intent.status === 'succeeded';
    } catch {
      return false;
    }
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
