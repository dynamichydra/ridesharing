import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { driverPayoutAccounts, drivers, countries, driverBankAccounts } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { env } from '../../config/env.js';
import { stripeGateway } from '../payment/gateways/stripe.gateway.js';

// ── Driver-facing — Stripe Connect Express onboarding ────────────────────────────
// Stripe hosts bank-detail collection and identity verification itself; this backend never
// touches a driver's raw bank account number for this path (see Phase 4 plan notes).

export async function startStripeOnboarding(driverId) {
  if (!stripeGateway.isConfigured) throw { statusCode: 503, message: 'Stripe is not configured' };

  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!driver) throw { statusCode: 404, message: 'Driver not found' };
  if (!driver.email) throw { statusCode: 422, message: 'Driver must have an email on file before starting payout onboarding' };

  let [account] = await db.select().from(driverPayoutAccounts).where(eq(driverPayoutAccounts.driverId, driverId)).limit(1);

  if (!account) {
    const countryCode = await _resolveCountryIsoCode(driver.countryId);
    const { stripeAccountId } = await stripeGateway.createConnectedAccount({ email: driver.email, countryCode });
    [account] = await db.insert(driverPayoutAccounts).values({
      driverId, gateway: 'stripe', stripeAccountId, status: 'pending',
    }).returning();
  }

  // No driver-facing app exists yet (the rider Flutter app is the only mobile client today).
  // DRIVER_APP_ONBOARDING_RETURN_URL/_REFRESH_URL let a deployment point these at a real
  // driver-app deep link (e.g. rideshare-driver://onboarding-return) the moment one exists,
  // with no code change — unset, they fall back to this backend's own placeholder
  // acknowledgement routes, which is all there is to redirect to during manual testing today.
  const baseUrl = env.APP_BASE_URL || `http://localhost:${env.PORT}`;
  const prefix = `${baseUrl}/api/${env.API_VERSION}/payout-accounts/stripe`;
  const { url } = await stripeGateway.createOnboardingLink({
    stripeAccountId: account.stripeAccountId,
    refreshUrl: env.DRIVER_APP_ONBOARDING_REFRESH_URL || `${prefix}/onboarding-refresh`,
    returnUrl: env.DRIVER_APP_ONBOARDING_RETURN_URL || `${prefix}/onboarding-return`,
  });
  return { url };
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

  await db.update(driverPayoutAccounts).set({
    stripeDetailsSubmitted: event.detailsSubmitted,
    stripePayoutsEnabled: event.payoutsEnabled,
    updatedAt: new Date(),
  }).where(eq(driverPayoutAccounts.stripeAccountId, event.stripeAccountId));

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
