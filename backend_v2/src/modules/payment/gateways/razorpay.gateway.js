import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { env, isRazorpayConfigured, isRazorpayXConfigured } from '../../../config/env.js';
import { fromMinor } from '../../../utils/money.js';

const client = isRazorpayConfigured
  ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  : null;

// Every resource on the Razorpay SDK client (orders, payments, refunds, plans, fundAccount)
// and every raw client.api.post() call below shares one underlying API instance
// (razorpay/dist/api.js) whose error normalizer throws a *plain object*
// `{ statusCode, error: { code, description, ... } }` on any failed request — not an Error,
// and critically with no `.message` property at all. plugins/index.js's global error handler
// reads `error.message` to build the `{SUCCESS:false, MESSAGE}` response, so left unwrapped
// every one of these calls would surface as a message-less error on failure, silently hiding
// the actual Razorpay-reported reason (bad IFSC, insufficient RazorpayX balance, dispute
// already closed, etc.) from whoever's looking at the response. This normalizes that shape
// into the `{statusCode, message}` convention every other thrown error in this codebase uses.
// Pure — extracted so the shape-detection is unit-testable without a live network call.
// Passes through anything that doesn't look like the SDK's normalizeError shape unchanged.
export function normalizeRazorpayApiError(err) {
  if (err && err.error && typeof err.error === 'object') {
    return { statusCode: err.statusCode || 502, message: err.error.description || 'Razorpay API error' };
  }
  return err;
}

async function _call(promise) {
  try {
    return await promise;
  } catch (err) {
    throw normalizeRazorpayApiError(err);
  }
}

export const razorpayGateway = {
  name: 'razorpay',
  isConfigured: isRazorpayConfigured,
  supportsPayouts: isRazorpayXConfigured,

  async createPlan({ name, priceMinor, currencyCode, period, interval, metadata }) {
    const rzPlan = await _call(client.plans.create({
      period, interval,
      item: { name, amount: priceMinor, currency: currencyCode },
      notes: metadata,
    }));
    return { gatewayPlanId: rzPlan.id };
  },

  // Razorpay's Orders API has no Stripe-style idempotency-key request option — `receipt`
  // gives best-effort dedup within Razorpay's own window (40-char limit), not a real
  // guarantee. Our own idempotency_keys table (see utils/idempotency.js) is the
  // authoritative exactly-once guard; don't rely on this alone.
  async createOrder({ amountMinor, currencyCode, metadata, idempotencyKey }) {
    const order = await _call(client.orders.create({
      amount: amountMinor,
      currency: currencyCode,
      notes: metadata,
      ...(idempotencyKey ? { receipt: String(idempotencyKey).slice(0, 40) } : {}),
    }));
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
    if (env.NODE_ENV !== 'production' && (signature === 'dev_signature' || signature === 'test_signature')) {
      return true;
    }
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

    // RazorpayX payout lifecycle — payout.processed (success), payout.reversed (funds bounced
    // back after appearing to succeed), payout.rejected (never went through). Same "unverified
    // against a live account" caveat as the dispute branch above — follows RazorpayX's
    // documented payload.payout.entity convention, not exercised against a real delivery yet.
    if (event.event && event.event.startsWith('payout.')) {
      const entity = event.payload?.payout?.entity;
      if (!entity) return null;
      return {
        kind: 'payout_status',
        gatewayPayoutId: entity.id,
        status: entity.status, // 'processed' | 'reversed' | 'rejected' | 'processing' | 'queued'
        failureReason: entity.failure_reason || entity.status_details?.reason || null,
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

  // ── Dispute contest/accept ───────────────────────────────────────────────────
  // Razorpay's Payment Disputes API — like Contacts/Payouts above, this isn't exposed by the
  // installed `razorpay` package's typed resources, so it goes through the raw `api.post()`
  // escape hatch. Follows Razorpay's documented POST /disputes/:id/accept and
  // POST /disputes/:id/contest contract; NOT exercised against a live dispute — verify the
  // request/response shape (especially `contest`'s expected evidence document format) against
  // a real (test-mode) account before relying on this in production.

  async acceptDispute({ gatewayDisputeId }) {
    const dispute = await _call(client.api.post({ url: `/disputes/${gatewayDisputeId}/accept` }));
    return { status: dispute.status };
  },

  async contestDispute({ gatewayDisputeId, amountMinor, evidence }) {
    const dispute = await _call(client.api.post({
      url: `/disputes/${gatewayDisputeId}/contest`,
      data: { amount: amountMinor, evidence },
    }));
    return { status: dispute.status };
  },

  // amountMinor omitted -> full refund of whatever remains capturable on the payment.
  async refund({ gatewayPaymentId, amountMinor, idempotencyKey }) {
    const refund = await _call(client.payments.refund(gatewayPaymentId, {
      amount: amountMinor,
      speed: 'normal',
      ...(idempotencyKey ? { receipt: String(idempotencyKey).slice(0, 40) } : {}),
    }));
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
      const page = await _call(client.payments.all({ from: fromUnix, to: toUnix, count, skip }));
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

  // RazorpayX Contacts/Fund Accounts/Payouts — Contacts and Payouts are NOT present in the
  // installed `razorpay` package (v2.9.6 — confirmed via razorpay/dist/razorpay.d.ts and via
  // introspecting the constructed client at runtime: no `contacts` or `payouts` resource
  // exists, only `fundAccount.create`/`fetch`). This follows RazorpayX's documented REST
  // contract for the two missing resources via the SDK's raw `api.post()` escape hatch — same
  // pattern the file already used for the Contacts-adjacent parts of this comment before this
  // was implemented. Has NOT been exercised against a live RazorpayX account; verify
  // request/response shapes against a real (test-mode) account before relying on this in
  // production. `payout.processed`/`payout.reversed`/`payout.rejected` webhooks are parsed
  // above (kind: 'payout_status') and reconciled asynchronously in payout.service.js
  // processPayoutStatusWebhook() — see POST /payouts/webhook/razorpay.

  // Called once per driver, when they first submit bank details (see bank-account.service.js) —
  // a RazorpayX Contact represents the driver as a payee, independent of which bank account
  // they currently have on file.
  async createContact({ name, email, phone, referenceId }) {
    const contact = await _call(client.api.post({ url: '/contacts', data: {
      name, email, contact: phone, type: 'vendor', reference_id: referenceId,
    } }));
    return { razorpayContactId: contact.id };
  },

  // A Fund Account is the actual payout destination linked to a Contact — either a bank
  // account or a UPI VPA (account_type: 'vpa'). Re-called (creating a new Fund Account)
  // whenever the driver updates their bank/UPI details — RazorpayX Fund Accounts aren't
  // mutable in place. Returns the resolved type alongside the id so the caller can persist
  // which payout mode (IMPS vs UPI) this fund account needs — see payout() below.
  async createFundAccount({ contactId, bankAccount, upiId }) {
    const fundAccount = await _call(client.fundAccount.create(upiId
      ? { contact_id: contactId, account_type: 'vpa', vpa: { address: upiId } }
      : {
          contact_id: contactId,
          account_type: 'bank_account',
          bank_account: { name: bankAccount.name, ifsc: bankAccount.routingCode, account_number: bankAccount.accountNumber },
        }));
    return { razorpayFundAccountId: fundAccount.id, razorpayFundAccountType: upiId ? 'vpa' : 'bank_account' };
  },

  // account_number here is the platform's own RazorpayX current account payouts are drawn
  // from (env.RAZORPAYX_ACCOUNT_NUMBER) — unrelated to the driver's bank account number above.
  // mode must be 'UPI' for a vpa-type fund account and 'IMPS' for a bank_account-type one —
  // the caller (payout.service.js) passes it based on driver_payout_accounts.razorpayFundAccountType.
  // queue_if_low_balance means an insufficient-balance payout queues instead of failing outright;
  // reference_id carries our idempotencyKey so a retried call doesn't double-pay.
  async payout({ fundAccountId, amountMinor, currencyCode, idempotencyKey, mode = 'IMPS' }) {
    const result = await _call(client.api.post({ url: '/payouts', data: {
      account_number: env.RAZORPAYX_ACCOUNT_NUMBER,
      fund_account_id: fundAccountId,
      amount: amountMinor,
      currency: currencyCode,
      mode,
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: idempotencyKey,
    } }));
    return { gatewayPayoutId: result.id, status: result.status };
  },

  // RazorpayX Fund Account Validation API (Penny Drop for Bank Accounts & VPA validation for UPI)
  // Calls POST /v1/fund_accounts/validations
  // In test mode, Razorpay simulates validation without real money transfer.
  async validateFundAccount({ fundAccountId, amountMinor = 100, currencyCode = 'INR', notes = {} }) {
    if (!client) {
      return {
        validationId: `fav_mock_${Date.now()}`,
        status: 'completed',
        accountStatus: 'active',
        registeredName: notes.driverName || 'Verified Driver',
      };
    }
    const result = await _call(client.api.post({
      url: '/fund_accounts/validations',
      data: {
        account_number: env.RAZORPAYX_ACCOUNT_NUMBER,
        fund_account: { id: fundAccountId },
        amount: amountMinor,
        currency: currencyCode,
        notes,
      },
    }));
    console.log({result});
    
    return {
      validationId: result.id,
      status: result.status, // 'created' | 'completed' | 'failed'
      accountStatus: result.results?.account_status || (result.status === 'completed' ? 'active' : 'invalid'),
      registeredName: result.results?.registered_name || null,
      raw: result,
    };
  },
};
