import { eq, and, desc, count, ilike, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { wallets, walletTransactions, drivers, users, countries } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { getDefaultCountry } from '../geo/geo.service.js';
import { postTransaction, getOrCreateSystemAccount, getOrCreateWalletAccount } from '../ledger/ledger.service.js';

const OWNER_COLUMN = { driver: wallets.driverId, rider: wallets.riderId };
const OWNER_TABLE = { driver: drivers, rider: users };

function ownerColumn(ownerType) {
  const col = OWNER_COLUMN[ownerType];
  if (!col) throw { statusCode: 400, message: 'ownerType must be driver or rider' };
  return col;
}

async function resolveOwnerCurrency(ownerType, ownerId) {
  const table = OWNER_TABLE[ownerType];
  const [owner] = await db.select({ countryId: table.countryId }).from(table).where(eq(table.id, ownerId)).limit(1);
  if (!owner) throw { statusCode: 404, message: `${ownerType === 'driver' ? 'Driver' : 'Rider'} not found` };

  if (owner.countryId) {
    const [country] = await db.select({ currencyCode: countries.currencyCode }).from(countries)
      .where(eq(countries.id, owner.countryId)).limit(1);
    if (country) return country.currencyCode;
  }
  const fallback = await getDefaultCountry();
  return fallback.currencyCode;
}

export async function getWallet(ownerType, ownerId) {
  const [wallet] = await db.select().from(wallets).where(eq(ownerColumn(ownerType), ownerId)).limit(1);
  return wallet || null;
}

export async function getOrCreateWallet(ownerType, ownerId) {
  const existing = await getWallet(ownerType, ownerId);
  if (existing) return existing;

  const currencyCode = await resolveOwnerCurrency(ownerType, ownerId);
  const values = { balanceMinor: 0, currencyCode };
  if (ownerType === 'driver') values.driverId = ownerId; else values.riderId = ownerId;

  const [wallet] = await db.insert(wallets).values(values).returning();
  return wallet;
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
