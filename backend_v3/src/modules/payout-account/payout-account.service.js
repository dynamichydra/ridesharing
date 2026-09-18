import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { driverPayoutAccounts, drivers, countries, driverBankAccounts } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { env } from '../../config/env.js';
import { gatewayRegistry } from '../payment/registry.js';
import { stripeGateway } from '../payment/gateways/stripe.gateway.js';
import { encrypt } from '../../utils/encryption.js';

// ── Unified Multi-Gateway Driver Setup ──────────────────────────────────────────

/**
 * Single unified entry point for Driver App & Admin Portal.
 * Automatically resolves the driver's country & gateway, returning:
 * - If hosted (e.g. Stripe/Canada): onboarding URL & hosted redirect schema.
 * - If direct form (e.g. Razorpay/India): required form fields & existing masked bank details.
 */
// TODO: In production, configure live Stripe Connect Webhook & Express keys in .env:
// - STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_CONNECT_WEBHOOK_SECRET, APP_BASE_URL

export async function getPayoutAccountSetup(driverId) {
  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!driver) throw { statusCode: 404, message: 'Driver not found' };

  const countryIsoCode = await _resolveCountryIsoCode(driver.countryId).catch(() => 'IN');
  const gateway = gatewayRegistry.getForCountry(countryIsoCode);
  if (!gateway) throw { statusCode: 503, message: `No payout gateway configured for country ${countryIsoCode}` };

  const [payoutAccount] = await db.select().from(driverPayoutAccounts).where(eq(driverPayoutAccounts.driverId, driverId)).limit(1);
  const [bankAccount] = await db.select().from(driverBankAccounts).where(eq(driverBankAccounts.driverId, driverId)).limit(1);

  const formSchema = gateway.getSetupFormSchema({ countryCode: countryIsoCode, driver });

  if (gateway.onboardingType === 'hosted_redirect') {
    let onboardingUrl = null;
    if (gateway.isConfigured) {
      const setup = await gateway.setupPayoutAccount(driver, {}, {
        countryCode: countryIsoCode,
        existingAccountId: payoutAccount?.stripeAccountId || null,
      }).catch((err) => {
        console.warn(`[PayoutAccount] Stripe setup notice: ${err.message}`);
        return null;
      });
      onboardingUrl = setup?.onboardingUrl || null;
    }

    return {
      gateway: gateway.name,
      countryCode: countryIsoCode,
      type: 'hosted_redirect',
      status: payoutAccount?.status || 'unconfigured',
      isReady: payoutAccount?.status === 'approved' || (payoutAccount?.stripePayoutsEnabled ?? false),
      stripePayoutsEnabled: payoutAccount?.stripePayoutsEnabled ?? false,
      stripeDetailsSubmitted: payoutAccount?.stripeDetailsSubmitted ?? false,
      onboardingUrl,
      requiresRedirect: true,
      formSchema,
    };
  }

  // Direct Bank Form (e.g. Razorpay / Bank transfer)
  return {
    gateway: gateway.name,
    countryCode: countryIsoCode,
    type: 'direct_bank_form',
    status: payoutAccount?.status || (bankAccount ? 'pending' : 'unconfigured'),
    isReady: payoutAccount?.status === 'approved',
    isVerified: bankAccount?.isVerified ?? false,
    existingDetails: bankAccount ? {
      bankName: bankAccount.bankName,
      accountHolderName: bankAccount.accountHolderName,
      accountNumberLast4: bankAccount.accountNumberLast4,
      routingCode: bankAccount.routingCode,
      upiId: bankAccount.upiId,
      walletProvider: bankAccount.walletProvider,
      isVerified: bankAccount.isVerified,
    } : null,
    requiresRedirect: false,
    formSchema,
  };
}

export async function approveMockStripeAccount(driverId) {
  let [payoutAccount] = await db.select().from(driverPayoutAccounts).where(eq(driverPayoutAccounts.driverId, driverId)).limit(1);
  const values = {
    driverId,
    gateway: 'stripe',
    status: 'approved',
    stripeAccountId: payoutAccount?.stripeAccountId || `acct_mock_${Date.now()}`,
    stripeDetailsSubmitted: true,
    stripePayoutsEnabled: true,
    verifiedAt: new Date(),
    updatedAt: new Date(),
  };

  if (payoutAccount) {
    [payoutAccount] = await db.update(driverPayoutAccounts).set(values).where(eq(driverPayoutAccounts.driverId, driverId)).returning();
  } else {
    [payoutAccount] = await db.insert(driverPayoutAccounts).values(values).returning();
  }

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: driverId, actorType: 'driver',
    action: 'PAYOUT_ACCOUNT_AUTO_VERIFIED', entityType: 'driver_payout_account', entityId: payoutAccount.id,
  });

  return payoutAccount;
}

/**
 * Unified submission handler for driver bank / payout account details.
 * Dispatches to the appropriate gateway adapter.
 */
export async function submitPayoutAccountSetup(driverId, data = {}, actor = { id: driverId, type: 'driver' }) {
  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!driver) throw { statusCode: 404, message: 'Driver not found' };

  const countryIsoCode = await _resolveCountryIsoCode(driver.countryId).catch(() => 'IN');
  const gateway = gatewayRegistry.getForCountry(countryIsoCode);
  if (!gateway) throw { statusCode: 503, message: `No payout gateway configured for country ${countryIsoCode}` };

  let [existingPayout] = await db.select().from(driverPayoutAccounts).where(eq(driverPayoutAccounts.driverId, driverId)).limit(1);

  // If direct bank details are provided, save to driverBankAccounts
  const { accountNumber, routingCode, accountHolderName, bankName, upiId, walletProvider, walletNumber } = data;
  if (accountNumber || upiId || walletNumber) {
    const bankValues = {
      driverId,
      countryId: driver.countryId,
      bankName: bankName || null,
      accountHolderName: accountHolderName || null,
      accountNumberEnc: accountNumber ? encrypt(accountNumber) : null,
      accountNumberLast4: accountNumber ? String(accountNumber).slice(-4) : null,
      routingCode: routingCode || null,
      upiId: upiId || null,
      walletProvider: walletProvider || null,
      walletNumberEnc: walletNumber ? encrypt(walletNumber) : null,
      isVerified: false,
      updatedAt: new Date(),
    };

    const [existingBank] = await db.select().from(driverBankAccounts).where(eq(driverBankAccounts.driverId, driverId)).limit(1);
    if (existingBank) {
      await db.update(driverBankAccounts).set(bankValues).where(eq(driverBankAccounts.driverId, driverId));
    } else {
      await db.insert(driverBankAccounts).values(bankValues);
    }
  }

  // Delegate to gateway adapter
  const result = await gateway.setupPayoutAccount(driver, data, {
    countryCode: countryIsoCode,
    existingAccountId: existingPayout?.stripeAccountId || existingPayout?.razorpayFundAccountId,
    existingContactId: existingPayout?.razorpayContactId,
  });

  const payoutValues = {
    driverId,
    gateway: gateway.name,
    status: result.status || 'pending',
    stripeAccountId: result.stripeAccountId || existingPayout?.stripeAccountId || null,
    razorpayContactId: result.razorpayContactId || existingPayout?.razorpayContactId || null,
    razorpayFundAccountId: result.razorpayFundAccountId || existingPayout?.razorpayFundAccountId || null,
    razorpayFundAccountType: result.razorpayFundAccountType || existingPayout?.razorpayFundAccountType || null,
    verifiedAt: result.isAutoVerified ? new Date() : existingPayout?.verifiedAt || null,
    updatedAt: new Date(),
  };

  const [payoutAccount] = existingPayout
    ? await db.update(driverPayoutAccounts).set(payoutValues).where(eq(driverPayoutAccounts.driverId, driverId)).returning()
    : await db.insert(driverPayoutAccounts).values(payoutValues).returning();

  if (result.isAutoVerified) {
    await db.update(driverBankAccounts).set({ isVerified: true, updatedAt: new Date() }).where(eq(driverBankAccounts.driverId, driverId));
    await publishEvent(TOPICS.NOTIF_PUSH, {
      userId: driverId,
      userType: 'driver',
      title: 'Payout account approved',
      body: 'Your payout account has been verified. You can now receive payouts.',
      type: 'PAYOUT_ACCOUNT_APPROVED',
    });
  }

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: actor.id,
    actorType: actor.type,
    action: result.isAutoVerified ? 'PAYOUT_ACCOUNT_AUTO_VERIFIED' : 'PAYOUT_ACCOUNT_SETUP_SUBMITTED',
    entityType: 'driver_payout_account',
    entityId: payoutAccount.id,
    ...(actor.type === 'admin' ? { meta: { driverId } } : {}),
  });

  return {
    ...result,
    payoutAccountId: payoutAccount.id,
  };
}

// ── Legacy Driver-facing — Stripe Connect Express onboarding ────────────────────

export async function startStripeOnboarding(driverId) {
  const setup = await getPayoutAccountSetup(driverId);
  if (setup.onboardingUrl) return { url: setup.onboardingUrl };

  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!driver) throw { statusCode: 404, message: 'Driver not found' };
  const countryCode = await _resolveCountryIsoCode(driver.countryId).catch(() => 'CA');

  const [account] = await db.select().from(driverPayoutAccounts).where(eq(driverPayoutAccounts.driverId, driverId)).limit(1);
  return stripeGateway.setupPayoutAccount(driver, {}, {
    countryCode,
    existingAccountId: account?.stripeAccountId,
  }).then((res) => ({ url: res.onboardingUrl }));
}

async function _resolveCountryIsoCode(countryId) {
  if (!countryId) throw { statusCode: 422, message: 'Driver has no country on record' };
  const [country] = await db.select({ isoCode: countries.isoCode }).from(countries).where(eq(countries.id, countryId)).limit(1);
  if (!country) throw { statusCode: 422, message: 'Driver country could not be resolved' };
  return country.isoCode;
}

export async function getMyPayoutAccount(driverId) {
  const [account] = await db.select().from(driverPayoutAccounts).where(eq(driverPayoutAccounts.driverId, driverId)).limit(1);
  return account || null;
}

// ── Gateway Webhook Ingestion ───────────────────────────────────────────────────

export async function handleGatewayWebhook(gatewayName, rawBody, signature) {
  const gateway = gatewayRegistry.get(gatewayName);
  if (!gateway) throw { statusCode: 400, message: `Unknown gateway webhook: ${gatewayName}` };

  if (gateway.name === 'stripe') {
    return handleStripeConnectWebhook(rawBody, signature);
  }
  return { received: true };
}

// ── Stripe Connect webhook ───────────────────────────────────────────────────────
// account.updated syncs the informational stripeDetailsSubmitted/stripePayoutsEnabled fields
// only — it never flips `status`. An admin still has to explicitly approve before a payout
// can run (see verifyPayoutAccount below and payout.service.js's eligibility check).

export async function handleStripeConnectWebhook(rawBody, signature) {
  if (!stripeGateway.verifyConnectWebhookSignature(rawBody, signature)) {
    throw { statusCode: 400, message: 'Invalid webhook signature' };
  }
  const event = stripeGateway.parseConnectWebhookEvent(rawBody, signature);
  if (!event) return { received: true };

  const isAutoApproved = !!(event.detailsSubmitted && event.payoutsEnabled);
  const [account] = await db.update(driverPayoutAccounts).set({
    stripeDetailsSubmitted: event.detailsSubmitted,
    stripePayoutsEnabled: event.payoutsEnabled,
    ...(isAutoApproved ? { status: 'approved', verifiedAt: new Date() } : {}),
    updatedAt: new Date(),
  }).where(eq(driverPayoutAccounts.stripeAccountId, event.stripeAccountId)).returning();

  if (isAutoApproved && account) {
    await publishEvent(TOPICS.AUDIT_LOG, {
      actorId: account.driverId, actorType: 'system',
      action: 'STRIPE_ACCOUNT_AUTO_VERIFIED', entityType: 'driver_payout_account', entityId: account.id,
    });
    await publishEvent(TOPICS.NOTIF_PUSH, {
      userId: account.driverId, userType: 'driver',
      title: 'Payout account approved',
      body: 'Your Stripe payout account has been verified and approved. You can now receive payouts.',
      type: 'PAYOUT_ACCOUNT_APPROVED',
    });
  }

  return { received: true };
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function listPayoutAccounts(filters, page, limit, offset) {
  const conditions = [];
  if (filters.status) conditions.push(eq(driverPayoutAccounts.status, filters.status));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(driverPayoutAccounts).where(where);
  const rows = await db.select({
    id: driverPayoutAccounts.id, driverId: driverPayoutAccounts.driverId,
    driverName: drivers.name, driverPhone: drivers.phone,
    gateway: driverPayoutAccounts.gateway, stripeAccountId: driverPayoutAccounts.stripeAccountId,
    stripeDetailsSubmitted: driverPayoutAccounts.stripeDetailsSubmitted,
    stripePayoutsEnabled: driverPayoutAccounts.stripePayoutsEnabled,
    razorpayFundAccountId: driverPayoutAccounts.razorpayFundAccountId,
    razorpayFundAccountType: driverPayoutAccounts.razorpayFundAccountType,
    // masked bank details only, for admin review of the razorpay path — never the raw
    // account number (see driver-bank-accounts.js / bank-account.service.js). upiId is a
    // shareable payment handle, not secret, so it's shown as-is.
    bankName: driverBankAccounts.bankName, accountHolderName: driverBankAccounts.accountHolderName,
    accountNumberLast4: driverBankAccounts.accountNumberLast4, routingCode: driverBankAccounts.routingCode,
    upiId: driverBankAccounts.upiId,
    status: driverPayoutAccounts.status, rejectionReason: driverPayoutAccounts.rejectionReason,
    verifiedBy: driverPayoutAccounts.verifiedBy, verifiedAt: driverPayoutAccounts.verifiedAt,
    createdAt: driverPayoutAccounts.createdAt, updatedAt: driverPayoutAccounts.updatedAt,
  }).from(driverPayoutAccounts)
    .innerJoin(drivers, eq(driverPayoutAccounts.driverId, drivers.id))
    .leftJoin(driverBankAccounts, eq(driverPayoutAccounts.driverId, driverBankAccounts.driverId))
    .where(where)
    .orderBy(desc(driverPayoutAccounts.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

// Identical shape to documents.service.js verifyDocument() — same admin-review convention.
export async function verifyPayoutAccount(id, adminId, approve, rejectionReason) {
  const [account] = await db.update(driverPayoutAccounts).set({
    status: approve ? 'approved' : 'rejected',
    rejectionReason: approve ? null : rejectionReason,
    verifiedBy: adminId,
    verifiedAt: new Date(),
  }).where(eq(driverPayoutAccounts.id, id)).returning();
  if (!account) throw { statusCode: 404, message: 'Payout account not found' };

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: approve ? 'PAYOUT_ACCOUNT_APPROVED' : 'PAYOUT_ACCOUNT_REJECTED',
    entityType: 'driver_payout_account', entityId: id,
  });
  await publishEvent(TOPICS.NOTIF_PUSH, {
    userId: account.driverId, userType: 'driver',
    title: approve ? 'Payout account approved' : 'Payout account rejected',
    body: approve ? 'You can now receive payouts.' : (rejectionReason || 'Please review your payout details.'),
    type: approve ? 'PAYOUT_ACCOUNT_APPROVED' : 'PAYOUT_ACCOUNT_REJECTED',
  });
  return account;
}
