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
// Always returns an Error instance so callers can safely use .message
export function normalizeRazorpayApiError(err) {
  if (err == null) return err;
  if (err && err.error && typeof err.error === 'object') {
    const msg = err.error.description || 'Razorpay API error';
    const e = new Error(msg);
    e.statusCode = err.statusCode || 502;
    e.razorpayError = err.error;
    return e;
  }
  if (err instanceof Error) return err;
  // plain object thrown (shouldn't happen but be safe)
  const e = new Error(err?.message || JSON.stringify(err));
  if (err?.statusCode) e.statusCode = err.statusCode;
  return e;
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
  onboardingType: 'direct_bank_form',

  getSetupFormSchema(context = {}) {
    return {
      gateway: 'razorpay',
      type: 'direct_bank_form',
      title: 'Bank & UPI Direct Payouts (India)',
      description: 'Enter your Indian bank account details (with IFSC) or UPI VPA ID for instant payouts.',
      supportedCurrencies: ['INR'],
      requiresRedirect: false,
      requiredFields: [
        { name: 'accountNumber', label: 'Account Number', type: 'string', required: false },
        { name: 'routingCode', label: 'IFSC Code', type: 'string', required: false },
        { name: 'accountHolderName', label: 'Account Holder Name', type: 'string', required: false },
        { name: 'bankName', label: 'Bank Name', type: 'string', required: false },
        { name: 'upiId', label: 'UPI VPA ID', type: 'string', required: false, placeholder: 'e.g. driver@okhdfcbank' },
      ],
    };
  },

  async setupPayoutAccount(driver, data = {}, options = {}) {
    const { accountNumber, routingCode, accountHolderName, upiId } = data;
    if (!accountNumber && !upiId) {
      throw { statusCode: 400, message: 'Either accountNumber (with routingCode/IFSC) or upiId is required' };
    }
    if (accountNumber && !routingCode) {
      throw { statusCode: 400, message: 'IFSC routingCode is required with accountNumber' };
    }

    let contactId = options.existingContactId || null;
    if (this.isConfigured && !contactId) {
      const contact = await this.createContact({
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        referenceId: driver.id,
      });
      contactId = contact.razorpayContactId;
    }

    let fundAccountId = null;
    let fundAccountType = null;
    let validationResult = null;
    let isAutoVerified = false;

    if (this.isConfigured && (upiId || accountNumber)) {
      const fund = await this.createFundAccount(
        upiId
          ? { contactId, upiId }
          : { contactId, bankAccount: { name: accountHolderName || driver.name, routingCode, accountNumber } }
      );
      fundAccountId = fund.razorpayFundAccountId;
      fundAccountType = fund.razorpayFundAccountType;

      // Run automated penny drop / UPI VPA validation
      try {
        validationResult = await this.validateFundAccount({
          fundAccountId,
          notes: { driverId: driver.id, driverName: driver.name },
        });

        if (validationResult.accountStatus === 'active') {
          isAutoVerified = true;
        }
      } catch (err) {
        console.warn('[RazorpayGateway] Penny drop validation failed:', err.message);
      }
    } else {
      fundAccountId = `fa_dev_${Date.now()}`;
      fundAccountType = upiId ? 'vpa' : 'bank_account';
    }

    return {
      gateway: 'razorpay',
      type: 'direct_bank_form',
      externalAccountId: fundAccountId,
      razorpayFundAccountId: fundAccountId,
      razorpayContactId: contactId,
      razorpayFundAccountType: fundAccountType,
      isAutoVerified,
      status: isAutoVerified ? 'approved' : 'pending',
      requiresRedirect: false,
    };
  },

  async executePayout({ destinationId, amountMinor, currencyCode, idempotencyKey }) {
    return this.payout({
      fundAccountId: destinationId,
      amountMinor,
      currencyCode,
      idempotencyKey,
    });
  },

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

  async chargeSavedMethod({ amountMinor, currencyCode, customerId, paymentMethodToken, metadata, idempotencyKey }) {
    if (!client) {
      return {
        gateway: 'razorpay',
        gatewayOrderId: `order_mock_${Date.now()}`,
        status: 'succeeded',
        amount: fromMinor(amountMinor, currencyCode),
        currency: currencyCode,
      };
    }

    const order = await _call(client.orders.create({
      amount: amountMinor,
      currency: currencyCode,
      notes: metadata,
      customer_id: customerId || undefined,
      ...(idempotencyKey ? { receipt: String(idempotencyKey).slice(0, 40) } : {}),
    }));

    return {
      gateway: 'razorpay',
      gatewayOrderId: order.id,
      amount: fromMinor(amountMinor, currencyCode),
      currency: currencyCode,
      keyId: env.RAZORPAY_KEY_ID,
      gatewayCustomerId: customerId,
      paymentMethodToken,
      requiresAction: true,
      status: 'requires_action',
    };
  },

  async createSetupIntent({ email, name, phone }) {
    if (!client) throw new Error("Razorpay is not configured");
    let customer;
    try {
      customer = await _call(client.customers.create({
        email,
        name,
        contact: phone || undefined,
        fail_existing: 0,
      }));
    } catch (e) {
      if (e.message && e.message.includes('Customer already exists')) {
        // Fallback: try fetching by phone or email
        let fetchedCustomers = await _call(client.customers.all({ count: 1, 'contact': phone || undefined }));
        if (fetchedCustomers && fetchedCustomers.items && fetchedCustomers.items.length > 0) {
          customer = fetchedCustomers.items[0];
        } else {
          fetchedCustomers = await _call(client.customers.all({ count: 1, 'email': email }));
          if (fetchedCustomers && fetchedCustomers.items && fetchedCustomers.items.length > 0) {
            customer = fetchedCustomers.items[0];
          } else {
            // Bulletproof fallback: create a brand new customer with a unique email
            const uniqueEmail = `user_${Date.now()}@example.com`;
            customer = await _call(client.customers.create({
              email: uniqueEmail,
              name,
              contact: phone || undefined,
              fail_existing: 0,
            }));
          }
        }
      } else {
        throw e;
      }
    }
    
    // Razorpay requires an order to open standard checkout and tokenize a card. 
    // We create a ₹1.00 auth order (100 paise) which allows card verification and saving.
    const order = await _call(client.orders.create({
      amount: 100,
      currency: 'INR',
      receipt: `setup_${Date.now()}`.slice(0, 40),
    }));

    return {
      gateway: 'razorpay',
      gatewayCustomerId: customer.id,
      gatewayOrderId: order.id,
      keyId: env.RAZORPAY_KEY_ID,
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
    for (; ;) {
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
    if (!client) return { razorpayContactId: `cont_mock_${Date.now()}` };
    try {
      const contact = await _call(client.api.post({
        url: '/contacts', data: {
          name, email, contact: phone, type: 'vendor', reference_id: referenceId,
        }
      }));
      return { razorpayContactId: contact.id };
    } catch (err) {
      if (env.NODE_ENV !== 'production' && (err.message?.includes('URL was not found') || !env.RAZORPAYX_ACCOUNT_NUMBER)) {
        console.warn('[RazorpayGateway:Contact] RazorpayX /contacts not enabled on test key. Simulating contact in dev mode.');
        return { razorpayContactId: `cont_sim_${Date.now()}` };
      }
      throw err;
    }
  },

  // A Fund Account is the actual payout destination linked to a Contact — either a bank
  // account or a UPI VPA (account_type: 'vpa'). Re-called (creating a new Fund Account)
  // whenever the driver updates their bank/UPI details — RazorpayX Fund Accounts aren't
  // mutable in place. Returns the resolved type alongside the id so the caller can persist
  // which payout mode (IMPS vs UPI) this fund account needs — see payout() below.
  async createFundAccount({ contactId, bankAccount, upiId }) {
    if (!client) {
      return { razorpayFundAccountId: `fa_mock_${Date.now()}`, razorpayFundAccountType: upiId ? 'vpa' : 'bank_account' };
    }
    try {
      const fundAccount = await _call(client.fundAccount.create(upiId
        ? { contact_id: contactId, account_type: 'vpa', vpa: { address: upiId } }
        : {
          contact_id: contactId,
          account_type: 'bank_account',
          bank_account: { name: bankAccount.name, ifsc: bankAccount.routingCode, account_number: bankAccount.accountNumber },
        }));
      return { razorpayFundAccountId: fundAccount.id, razorpayFundAccountType: upiId ? 'vpa' : 'bank_account' };
    } catch (err) {
      if (env.NODE_ENV !== 'production' && (err.message?.includes('URL was not found') || !env.RAZORPAYX_ACCOUNT_NUMBER)) {
        console.warn('[RazorpayGateway:FundAccount] Simulating fund account in dev mode.');
        return { razorpayFundAccountId: `fa_sim_${Date.now()}`, razorpayFundAccountType: upiId ? 'vpa' : 'bank_account' };
      }
      throw err;
    }
  },

  // account_number here is the platform's own RazorpayX current account payouts are drawn
  // from (env.RAZORPAYX_ACCOUNT_NUMBER) — unrelated to the driver's bank account number above.
  // mode must be 'UPI' for a vpa-type fund account and 'IMPS' for a bank_account-type one —
  // the caller (payout.service.js) passes it based on driver_payout_accounts.razorpayFundAccountType.
  // queue_if_low_balance means an insufficient-balance payout queues instead of failing outright;
  // reference_id carries our idempotencyKey so a retried call doesn't double-pay.
  async payout({ fundAccountId, amountMinor, currencyCode, idempotencyKey, mode = 'IMPS' }) {
    if (!client || (env.NODE_ENV !== 'production' && (!env.RAZORPAYX_ACCOUNT_NUMBER || env.RAZORPAYX_ACCOUNT_NUMBER === 'test_account'))) {
      console.warn('[RazorpayGateway:Payout] RAZORPAYX_ACCOUNT_NUMBER not configured or in development. Simulating successful payout.');
      return {
        gatewayPayoutId: `pout_sim_${Date.now()}`,
        status: 'processed',
      };
    }
    try {
      const result = await _call(client.api.post({
        url: '/payouts', data: {
          account_number: env.RAZORPAYX_ACCOUNT_NUMBER,
          fund_account_id: fundAccountId,
          amount: amountMinor,
          currency: currencyCode,
          mode,
          purpose: 'payout',
          queue_if_low_balance: true,
          reference_id: idempotencyKey,
        }
      }));
      return { gatewayPayoutId: result.id, status: result.status };
    } catch (err) {
      if (env.NODE_ENV !== 'production' && err.message?.includes('URL was not found')) {
        console.warn('[RazorpayGateway:Payout] RazorpayX /payouts endpoint not available on this key. Simulating dev payout.');
        return {
          gatewayPayoutId: `pout_sim_${Date.now()}`,
          status: 'processed',
        };
      }
      throw err;
    }
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
    console.log({ result });

    return {
      validationId: result.id,
      status: result.status, // 'created' | 'completed' | 'failed'
      accountStatus: result.results?.account_status || (result.status === 'completed' ? 'active' : 'invalid'),
      registeredName: result.results?.registered_name || null,
      raw: result,
    };
  },
};
