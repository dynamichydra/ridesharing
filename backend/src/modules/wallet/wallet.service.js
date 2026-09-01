import { eq, and, desc, count, ilike, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { wallets, walletTransactions, walletWithdrawals, drivers, users, countries, payments } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { enqueueEvent } from '../../utils/outbox.js';
import { paginate } from '../../utils/response.js';
import { getDefaultCountry } from '../geo/geo.service.js';
import { postTransaction, getOrCreateSystemAccount, getOrCreateWalletAccount } from '../ledger/ledger.service.js';
import { getGateway, gatewayForCurrency } from '../payment/payment.service.js';
import { withIdempotency } from '../../utils/idempotency.js';
import { publishNotification } from '../notification/notification-events.js';
import { formatMoney } from '../../utils/money.js';
import { getRiderBankDetails } from '../bank-account/rider-bank-account.service.js';

const OWNER_COLUMN = { driver: wallets.driverId, rider: wallets.riderId };
const OWNER_TABLE = { driver: drivers, rider: users };

function ownerColumn(ownerType) {
  const col = OWNER_COLUMN[ownerType];
  if (!col) throw { statusCode: 400, message: 'ownerType must be driver or rider' };
  return col;
}

// Resolves the {id, currencyCode} of the owner's country, falling back to the platform
// default country — shared by wallet creation (currency only) and wallet top-up (needs the
// id too, since payments.countryId is not-null).
async function resolveOwnerCountry(ownerType, ownerId) {
  const table = OWNER_TABLE[ownerType];
  const [owner] = await db.select({ countryId: table.countryId }).from(table).where(eq(table.id, ownerId)).limit(1);
  if (!owner) throw { statusCode: 404, message: `${ownerType === 'driver' ? 'Driver' : 'Rider'} not found` };

  if (owner.countryId) {
    const [country] = await db.select().from(countries).where(eq(countries.id, owner.countryId)).limit(1);
    if (country) return country;
  }
  return getDefaultCountry();
}

export async function getWallet(ownerType, ownerId) {
  const [wallet] = await db.select().from(wallets).where(eq(ownerColumn(ownerType), ownerId)).limit(1);
  return wallet || null;
}

export async function getOrCreateWallet(ownerType, ownerId) {
  const country = await resolveOwnerCountry(ownerType, ownerId);
  const existing = await getWallet(ownerType, ownerId);
  if (existing) {
    if (country?.currencyCode && existing.currencyCode !== country.currencyCode) {
      const [updated] = await db.update(wallets)
        .set({ currencyCode: country.currencyCode, updatedAt: new Date() })
        .where(eq(wallets.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const values = { balanceMinor: 0, currencyCode: country.currencyCode };
  if (ownerType === 'driver') values.driverId = ownerId; else values.riderId = ownerId;

  const [wallet] = await db.insert(wallets).values(values).returning();
  return wallet;
}

// ── Self-service — rider/driver own wallet ───────────────────────────────────────

// Resolves which owner type a JWT role maps to for the "my wallet" endpoints. Admins have no
// personal wallet — they only ever touch wallets via the admin routes below.
function resolveOwnerTypeFromRole(role) {
  if (role === 'driver' || role === 'rider') return role;
  throw { statusCode: 403, message: 'Only riders and drivers have a personal wallet' };
}

export async function getMyWallet(user) {
  const ownerType = resolveOwnerTypeFromRole(user.role);
  return getOrCreateWallet(ownerType, user.id);
}

export async function creditDemoTopup(user, amountMinor) {
  const ownerType = resolveOwnerTypeFromRole(user.role);
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw { statusCode: 400, message: 'amountMinor must be a positive integer' };
  }
  const wallet = await getOrCreateWallet(ownerType, user.id);
  const country = await resolveOwnerCountry(ownerType, user.id);
  return _creditWalletTopup(wallet, country.id, {
    gateway: 'demo_wallet',
    gatewayPaymentId: 'demo_topup_' + Date.now(),
    gatewayOrderId: null,
    amountMinor,
  });
}

// idempotencyKey comes from the client's Idempotency-Key header (required — see
// wallet.routes.js) so a retried/double-submitted initiate request returns the original
// gateway order instead of creating a second one. Mirrors ride-payment.service.js
// initiateRidePayment's shape (dev-mode fallback when the currency's gateway has no keys
// configured, real gateway order otherwise).
export async function initiateWalletTopup(user, amountMinor, idempotencyKey) {
  const ownerType = resolveOwnerTypeFromRole(user.role);
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw { statusCode: 400, message: 'amountMinor must be a positive integer' };
  }

  return withIdempotency('wallet_topup_initiate', idempotencyKey, user.id, async () => {
    const wallet = await getOrCreateWallet(ownerType, user.id);
    const country = await resolveOwnerCountry(ownerType, user.id);
    const gateway = gatewayForCurrency(wallet.currencyCode);

    if (!gateway) {
      // Dev mode — this currency's gateway has no keys configured, credit directly.
      return _creditWalletTopup(wallet, country.id, {
        gateway: 'none', gatewayPaymentId: 'dev_topup_' + Date.now(), gatewayOrderId: null, amountMinor,
      });
    }

    const order = await gateway.createOrder({
      amountMinor, currencyCode: wallet.currencyCode,
      metadata: { walletId: wallet.id, ownerType, ownerId: user.id },
      idempotencyKey,
    });

    const [payment] = await db.insert(payments).values({
      walletId: wallet.id,
      countryId: country.id,
      gateway: gateway.name,
      currencyCode: wallet.currencyCode,
      amountMinor,
      status: 'created',
      gatewayOrderId: order.gatewayOrderId,
    }).returning();

    return { ...order, paymentAttemptId: payment.id };
  });
}

export async function verifyWalletTopup(user, orderRef, paymentRef, signature) {
  const ownerType = resolveOwnerTypeFromRole(user.role);
  const wallet = await getOrCreateWallet(ownerType, user.id);

  const [attempt] = await db.select().from(payments)
    .where(and(eq(payments.gatewayOrderId, orderRef), eq(payments.walletId, wallet.id))).limit(1);
  if (!attempt) throw { statusCode: 404, message: 'Wallet top-up order not found' };
  if (attempt.status === 'captured') throw { statusCode: 409, message: 'This top-up has already been credited' };

  const gateway = getGateway(attempt.gateway);
  const verified = await gateway.verifyPayment({ orderRef, paymentRef, signature });
  if (!verified) throw { statusCode: 400, message: 'Payment verification failed' };

  return _creditWalletTopup(wallet, attempt.countryId, {
    gateway: gateway.name, gatewayPaymentId: paymentRef, gatewayOrderId: orderRef,
    amountMinor: attempt.amountMinor, paymentAttemptId: attempt.id,
  });
}

// Dr the gateway's processor-clearing account, Cr the owner's wallet — the same shape as an
// online ride fare's clearing leg (ride-payment.service.js _postRideFareLedger), just without
// a commission split since a top-up isn't a fare.
async function _creditWalletTopup(wallet, countryId, paymentInfo) {
  if (paymentInfo.paymentAttemptId) {
    await db.update(payments)
      .set({ status: 'captured', gatewayPaymentId: paymentInfo.gatewayPaymentId, updatedAt: new Date() })
      .where(eq(payments.id, paymentInfo.paymentAttemptId));
  } else {
    await db.insert(payments).values({
      walletId: wallet.id,
      countryId,
      gateway: paymentInfo.gateway,
      currencyCode: wallet.currencyCode,
      amountMinor: paymentInfo.amountMinor,
      status: 'captured',
      gatewayOrderId: paymentInfo.gatewayOrderId,
      gatewayPaymentId: paymentInfo.gatewayPaymentId,
    });
  }

  const [walletAccount, clearingAccount] = await Promise.all([
    getOrCreateWalletAccount(wallet.id, wallet.currencyCode),
    getOrCreateSystemAccount(`processor_clearing:${paymentInfo.gateway}`, wallet.currencyCode),
  ]);

  const { walletUpdates } = await postTransaction({
    businessType: 'wallet_topup',
    idempotencyKey: `wallet_topup_ledger:${paymentInfo.gatewayOrderId || paymentInfo.gatewayPaymentId}`,
    referenceType: 'wallet', referenceId: wallet.id,
    entries: [
      { accountId: clearingAccount.id, direction: 'debit', amountMinor: paymentInfo.amountMinor, currencyCode: wallet.currencyCode },
      {
        accountId: walletAccount.id, direction: 'credit', amountMinor: paymentInfo.amountMinor, currencyCode: wallet.currencyCode,
        reason: 'wallet_topup', description: 'Self-service wallet top-up',
      },
    ],
  });

  const walletUpdate = walletUpdates.find((u) => u.wallet.id === wallet.id);
  const result = { wallet: walletUpdate?.wallet ?? wallet, transaction: walletUpdate?.walletTransaction ?? null };

  const ownerType = wallet.driverId ? 'driver' : 'rider';
  const ownerId = wallet.driverId || wallet.riderId;

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: ownerId, actorType: ownerType,
    action: 'WALLET_TOPPED_UP', entityType: 'wallet', entityId: wallet.id,
    meta: { amountMinor: paymentInfo.amountMinor, gateway: paymentInfo.gateway },
  });
  await publishNotification('WALLET_TOPUP', {
    userId: ownerId, userType: ownerType,
    variables: { amount: formatMoney(paymentInfo.amountMinor, wallet.currencyCode) },
  });

  return result;
}

// ── Rider self-service — wallet withdrawal request ───────────────────────────────
// Drivers already have a real payout rail (bank transfer via Razorpay/Stripe — see
// payout.service.js); riders don't (see rider-bank-accounts.js), so this is deliberately
// scoped to riders only. Approval doesn't call a gateway — an admin manually wires the money
// to whatever bank/UPI/wallet details the rider has on file and approval just records that
// and debits the ledger, same "admin does the last mile" shape as the rest of this system's
// stubs where no generic bank-transfer gateway integration exists.

export async function requestWalletWithdrawal(riderId, amountMinor, reason) {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw { statusCode: 400, message: 'amountMinor must be a positive integer' };
  }
  if (!reason) throw { statusCode: 400, message: 'reason is required' };

  const bankDetails = await getRiderBankDetails(riderId);
  if (!bankDetails) {
    throw { statusCode: 422, message: 'No bank/UPI details on file — contact support to have them added before requesting a withdrawal' };
  }

  const wallet = await getOrCreateWallet('rider', riderId);
  if (amountMinor > wallet.balanceMinor) {
    throw { statusCode: 422, message: `Withdrawal amount (${amountMinor}) exceeds wallet balance (${wallet.balanceMinor})` };
  }

  const [openRequest] = await db.select().from(walletWithdrawals)
    .where(and(eq(walletWithdrawals.walletId, wallet.id), eq(walletWithdrawals.status, 'requested'))).limit(1);
  if (openRequest) throw { statusCode: 409, message: 'A withdrawal request for this wallet is already awaiting review' };

  const withdrawalRow = await db.transaction(async (tx) => {
    const [row] = await tx.insert(walletWithdrawals).values({
      walletId: wallet.id, ownerType: 'rider', ownerId: riderId,
      amountMinor, currencyCode: wallet.currencyCode, reason, status: 'requested',
    }).returning();

    await enqueueEvent(tx, {
      aggregateType: 'wallet_withdrawal', aggregateId: row.id, topic: TOPICS.AUDIT_LOG,
      payload: {
        actorId: riderId, actorType: 'rider', action: 'WALLET_WITHDRAWAL_REQUESTED',
        entityType: 'wallet_withdrawal', entityId: row.id,
        meta: { walletId: wallet.id, amountMinor },
      },
    });

    return row;
  });

  return withdrawalRow;
}

export async function getMyWalletWithdrawals(riderId, page, limit, offset) {
  const where = eq(walletWithdrawals.ownerId, riderId);
  const [{ total }] = await db.select({ total: count() }).from(walletWithdrawals).where(where);
  const rows = await db.select().from(walletWithdrawals).where(where)
    .orderBy(desc(walletWithdrawals.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

// Locks the row and flips requested->processing inside one transaction so a concurrent
// approve/reject can't slip through before the ledger post — mirrors refund.service.js
// approveRefundRequest's requested->pending step. If the ledger post is rejected (most likely:
// the wallet balance dropped below the requested amount since the request was made), the row
// is marked 'failed' and the error propagates instead of silently completing.
export async function approveWalletWithdrawal(id, adminId) {
  const withdrawalRow = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(walletWithdrawals).where(eq(walletWithdrawals.id, id)).for('update').limit(1);
    if (!existing) throw { statusCode: 404, message: 'Withdrawal request not found' };
    if (existing.status !== 'requested') throw { statusCode: 409, message: `Withdrawal request is already '${existing.status}'` };

    const [updated] = await tx.update(walletWithdrawals)
      .set({ status: 'processing', reviewedById: adminId, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(walletWithdrawals.id, id)).returning();
    return updated;
  });

  try {
    const [walletAccount, clearingAccount] = await Promise.all([
      getOrCreateWalletAccount(withdrawalRow.walletId, withdrawalRow.currencyCode),
      getOrCreateSystemAccount('wallet_withdrawal_clearing', withdrawalRow.currencyCode),
    ]);
    await postTransaction({
      businessType: 'wallet_withdrawal',
      idempotencyKey: `wallet_withdrawal:${withdrawalRow.id}`,
      referenceType: 'wallet_withdrawal', referenceId: withdrawalRow.id,
      entries: [
        {
          accountId: walletAccount.id, direction: 'debit', amountMinor: withdrawalRow.amountMinor, currencyCode: withdrawalRow.currencyCode,
          reason: 'wallet_withdrawal', description: `Withdrawal ${withdrawalRow.id}`,
        },
        { accountId: clearingAccount.id, direction: 'credit', amountMinor: withdrawalRow.amountMinor, currencyCode: withdrawalRow.currencyCode },
      ],
    });
  } catch (err) {
    await db.update(walletWithdrawals).set({ status: 'failed', updatedAt: new Date() }).where(eq(walletWithdrawals.id, id));
    throw err;
  }

  const [updated] = await db.update(walletWithdrawals)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(eq(walletWithdrawals.id, id)).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin', action: 'WALLET_WITHDRAWAL_APPROVED',
    entityType: 'wallet_withdrawal', entityId: id,
    meta: { amountMinor: withdrawalRow.amountMinor },
  });
  await publishNotification('WALLET_WITHDRAWAL_APPROVED', {
    userId: withdrawalRow.ownerId, userType: withdrawalRow.ownerType,
    variables: { amount: formatMoney(withdrawalRow.amountMinor, withdrawalRow.currencyCode) },
  });

  return updated;
}

export async function rejectWalletWithdrawal(id, adminId, rejectionReason) {
  if (!rejectionReason) throw { statusCode: 400, message: 'rejectionReason is required' };

  const [withdrawalRow] = await db.update(walletWithdrawals)
    .set({ status: 'rejected', rejectionReason, reviewedById: adminId, reviewedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(walletWithdrawals.id, id), eq(walletWithdrawals.status, 'requested')))
    .returning();
  if (!withdrawalRow) throw { statusCode: 409, message: 'Withdrawal request is not in a reviewable state' };

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin', action: 'WALLET_WITHDRAWAL_REJECTED',
    entityType: 'wallet_withdrawal', entityId: withdrawalRow.id,
    meta: { rejectionReason },
  });
  await publishNotification('WALLET_WITHDRAWAL_REJECTED', {
    userId: withdrawalRow.ownerId, userType: withdrawalRow.ownerType,
    variables: { reason: rejectionReason },
  });

  return withdrawalRow;
}

// ── Admin reads ──────────────────────────────────────────────────────────────────

export async function listWalletWithdrawals(filters, page, limit, offset) {
  const conditions = [];
  if (filters.status) conditions.push(eq(walletWithdrawals.status, filters.status));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(walletWithdrawals).where(where);
  const rows = await db.select().from(walletWithdrawals).where(where)
    .orderBy(desc(walletWithdrawals.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function listTransactions(walletId, page, limit, offset) {
  const where = eq(walletTransactions.walletId, walletId);
  const [{ total }] = await db.select({ total: count() }).from(walletTransactions).where(where);
  const rows = await db.select().from(walletTransactions).where(where)
    .orderBy(desc(walletTransactions.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

// Posts through the ledger (Dr/Cr against a system 'wallet_adjustment_expense' account)
// instead of hand-rolling the lock+insert — ledgerService.postTransaction owns the
// SELECT...FOR UPDATE + balance update + wallet_transactions insert now, shared with every
// other ledger poster. External signature/response shape is unchanged for wallet.routes.js.
export async function adminAdjustWallet(ownerType, ownerId, { type, amountMinor, reason, description }, adminId) {
  if (!['credit', 'debit'].includes(type)) throw { statusCode: 400, message: 'type must be credit or debit' };
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw { statusCode: 400, message: 'amountMinor must be a positive integer' };
  if (!reason) throw { statusCode: 400, message: 'reason is required' };

  const wallet = await getOrCreateWallet(ownerType, ownerId);
  const currencyCode = wallet.currencyCode;

  const [walletAccount, expenseAccount] = await Promise.all([
    getOrCreateWalletAccount(wallet.id, currencyCode),
    getOrCreateSystemAccount('wallet_adjustment_expense', currencyCode),
  ]);

  // Credit the wallet -> Dr the platform expense account, Cr the wallet.
  // Debit the wallet  -> Dr the wallet, Cr the platform expense account.
  const entries = type === 'credit'
    ? [
        { accountId: expenseAccount.id, direction: 'debit',  amountMinor, currencyCode },
        { accountId: walletAccount.id,  direction: 'credit', amountMinor, currencyCode, reason, description, createdBy: adminId },
      ]
    : [
        { accountId: walletAccount.id,  direction: 'debit',  amountMinor, currencyCode, reason, description, createdBy: adminId },
        { accountId: expenseAccount.id, direction: 'credit', amountMinor, currencyCode },
      ];

  const { walletUpdates } = await postTransaction({
    businessType: 'wallet_admin_adjustment',
    referenceType: 'manual',
    referenceId: null,
    metadata: { ownerType, ownerId, adminId },
    entries,
  });

  const walletUpdate = walletUpdates.find((u) => u.wallet.id === wallet.id);
  const result = { wallet: walletUpdate.wallet, transaction: walletUpdate.walletTransaction };

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: type === 'credit' ? 'WALLET_CREDITED' : 'WALLET_DEBITED',
    entityType: 'wallet', entityId: result.wallet.id,
    meta: { ownerType, ownerId, amountMinor, reason },
  });
  return result;
}

// ── Admin — global wallet list across drivers + riders ──────────────────────

function geoConditions(table, filters) {
  const conditions = [];
  if (filters.countryId) conditions.push(eq(table.countryId, filters.countryId));
  if (filters.stateId) conditions.push(eq(table.stateId, filters.stateId));
  if (filters.cityId) conditions.push(eq(table.cityId, filters.cityId));
  if (filters.search) {
    conditions.push(sql`(${ilike(table.name, `%${filters.search}%`)} or ${ilike(table.phone, `%${filters.search}%`)})`);
  }
  return conditions;
}

function driverWalletsQuery(filters) {
  const conditions = geoConditions(drivers, filters);
  const where = conditions.length ? and(...conditions) : undefined;
  return db.select({
    id: wallets.id, ownerType: sql`'driver'`.as('owner_type'), ownerId: wallets.driverId,
    ownerName: drivers.name, ownerPhone: drivers.phone,
    balanceMinor: wallets.balanceMinor, currencyCode: wallets.currencyCode, status: wallets.status,
    createdAt: wallets.createdAt,
  }).from(wallets).innerJoin(drivers, eq(wallets.driverId, drivers.id)).where(where)
    .orderBy(desc(wallets.createdAt));
}

function riderWalletsQuery(filters) {
  const conditions = geoConditions(users, filters);
  const where = conditions.length ? and(...conditions) : undefined;
  return db.select({
    id: wallets.id, ownerType: sql`'rider'`.as('owner_type'), ownerId: wallets.riderId,
    ownerName: users.name, ownerPhone: users.phone,
    balanceMinor: wallets.balanceMinor, currencyCode: wallets.currencyCode, status: wallets.status,
    createdAt: wallets.createdAt,
  }).from(wallets).innerJoin(users, eq(wallets.riderId, users.id)).where(where)
    .orderBy(desc(wallets.createdAt));
}

// Filtering happens in SQL (only matching wallets are ever fetched); merging the two
// already-filtered owner-type result sets and paginating is done in JS since drivers and
// riders live in different tables and Drizzle's cross-table union doesn't support ordering
// by an aliased column cleanly. Fine for admin-panel scale; revisit with a real UNION view
// if the combined wallet count grows large.
export async function listWallets(filters, page, limit, offset) {
  const includeDrivers = filters.ownerType !== 'rider';
  const includeRiders = filters.ownerType !== 'driver';

  const [driverRows, riderRows] = await Promise.all([
    includeDrivers ? driverWalletsQuery(filters) : Promise.resolve([]),
    includeRiders ? riderWalletsQuery(filters) : Promise.resolve([]),
  ]);

  const rows = [...driverRows, ...riderRows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = rows.length;
  const paged = rows.slice(offset, offset + limit);
  return { rows: paged, pagination: paginate(page, limit, total) };
}
