import { eq, and, desc, count, ilike, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { wallets, walletTransactions, drivers, users, countries } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { getDefaultCountry } from '../geo/geo.service.js';

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

export async function adminAdjustWallet(ownerType, ownerId, { type, amountMinor, reason, description }, adminId) {
  if (!['credit', 'debit'].includes(type)) throw { statusCode: 400, message: 'type must be credit or debit' };
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw { statusCode: 400, message: 'amountMinor must be a positive integer' };
  if (!reason) throw { statusCode: 400, message: 'reason is required' };

  await getOrCreateWallet(ownerType, ownerId); // ensures a row exists before we lock it below

  return db.transaction(async (tx) => {
    const [wallet] = await tx.select().from(wallets)
      .where(eq(ownerColumn(ownerType), ownerId)).for('update').limit(1);

    const delta = type === 'credit' ? amountMinor : -amountMinor;
    const newBalance = wallet.balanceMinor + delta;
    if (newBalance < 0) throw { statusCode: 422, message: 'Insufficient wallet balance for this debit' };

    const [updated] = await tx.update(wallets)
      .set({ balanceMinor: newBalance, updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id)).returning();

    const [txnRow] = await tx.insert(walletTransactions).values({
      walletId: wallet.id, type, amountMinor,
      balanceAfterMinor: newBalance,
      currencyCode: wallet.currencyCode,
      reason, description,
      referenceType: 'manual',
      createdBy: adminId,
    }).returning();

    return { wallet: updated, transaction: txnRow };
  }).then(async (result) => {
    await publishEvent(TOPICS.AUDIT_LOG, {
      actorId: adminId, actorType: 'admin',
      action: type === 'credit' ? 'WALLET_CREDITED' : 'WALLET_DEBITED',
      entityType: 'wallet', entityId: result.wallet.id,
      meta: { ownerType, ownerId, amountMinor, reason },
    });
    return result;
  });
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
