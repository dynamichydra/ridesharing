import { eq, and, inArray, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  ledgerAccounts, ledgerTransactions, ledgerEntries, wallets, walletTransactions,
} from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

/**
 * Pure balance-invariant check — every transaction's entries must sum to zero per
 * currencyCode (debits == credits). Extracted so it's unit-testable without a DB; the DB
 * write path (postTransaction) calls this before inserting anything.
 * Returns { balanced: true } or { balanced: false, message }.
 */
export function validateBalancedEntries(entries) {
  if (!Array.isArray(entries) || entries.length < 2) {
    return { balanced: false, message: 'A transaction needs at least two entries' };
  }
  const totals = {};
  for (const { direction, amountMinor, currencyCode } of entries) {
    if (!['debit', 'credit'].includes(direction)) {
      return { balanced: false, message: `Invalid entry direction: ${direction}` };
    }
    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      return { balanced: false, message: 'Every entry amountMinor must be a positive integer' };
    }
    const sign = direction === 'debit' ? 1 : -1;
    totals[currencyCode] = (totals[currencyCode] || 0) + sign * amountMinor;
  }
  const unbalanced = Object.entries(totals).filter(([, total]) => total !== 0);
  if (unbalanced.length > 0) {
    return { balanced: false, message: `Entries do not balance for: ${unbalanced.map(([c]) => c).join(', ')}` };
  }
  return { balanced: true };
}

// ── Account resolution ─────────────────────────────────────────────────────────

export async function getOrCreateSystemAccount(code, currencyCode) {
  const [existing] = await db.select().from(ledgerAccounts)
    .where(and(eq(ledgerAccounts.code, code), eq(ledgerAccounts.currencyCode, currencyCode))).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(ledgerAccounts)
    .values({ type: 'system', code, currencyCode })
    .onConflictDoNothing({ target: [ledgerAccounts.code, ledgerAccounts.currencyCode] })
    .returning();
  if (created) return created;

  // Lost the create race to a concurrent caller — the row exists now, fetch it.
  const [row] = await db.select().from(ledgerAccounts)
    .where(and(eq(ledgerAccounts.code, code), eq(ledgerAccounts.currencyCode, currencyCode))).limit(1);
  return row;
}

export async function getOrCreateWalletAccount(walletId, currencyCode) {
  const [existing] = await db.select().from(ledgerAccounts)
    .where(eq(ledgerAccounts.walletId, walletId)).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(ledgerAccounts)
    .values({ type: 'wallet', currencyCode, walletId })
    .onConflictDoNothing({ target: [ledgerAccounts.walletId] })
    .returning();
  if (created) return created;

  const [row] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.walletId, walletId)).limit(1);
  return row;
}

// ── Posting ─────────────────────────────────────────────────────────────────────

/**
 * The only way anything writes to the ledger. `entries` is
 * [{ accountId, direction: 'debit'|'credit', amountMinor, currencyCode }, ...] — resolve
 * account ids via getOrCreateSystemAccount/getOrCreateWalletAccount before calling this.
 * Exactly-once: if `idempotencyKey` is given and a transaction with it already exists,
 * returns that transaction instead of posting again (Part 1.3's guarantee, enforced at the
 * ledger layer itself, independent of any request-level idempotency wrapper).
 */
export async function postTransaction({ businessType, idempotencyKey, entries, referenceType, referenceId, metadata }) {
  if (idempotencyKey) {
    const existing = await getTransactionByIdempotencyKey(idempotencyKey);
    if (existing) return existing;
  }

  const check = validateBalancedEntries(entries);
  if (!check.balanced) throw { statusCode: 422, message: `Unbalanced ledger transaction: ${check.message}` };

  return db.transaction(async (tx) => {
    let transaction;
    try {
      [transaction] = await tx.insert(ledgerTransactions)
        .values({ businessType, idempotencyKey, referenceType, referenceId, metadata })
        .returning();
    } catch (err) {
      if (err.code === '23505' && idempotencyKey) {
        // Lost a concurrent race on the same idempotency key — replay the winner's result.
        const existing = await getTransactionByIdempotencyKey(idempotencyKey);
        if (existing) return existing;
      }
      throw err;
    }

    // Only the actual ledger_entries columns go into the insert — `reason`/`description`
    // (optional, used only for the wallet_transactions side-effect row below) are kept on
    // the side and re-zipped onto the returned rows by array position.
    const insertedEntries = await tx.insert(ledgerEntries).values(
      entries.map(({ accountId, direction, amountMinor, currencyCode }) => ({
        accountId, direction, amountMinor, currencyCode, transactionId: transaction.id,
      })),
    ).returning();

    const walletUpdates = await _applyWalletSideEffects(tx, insertedEntries, entries, referenceType, referenceId);

    return { transaction, entries: insertedEntries, walletUpdates };
  });
}

async function getTransactionByIdempotencyKey(idempotencyKey) {
  const [transaction] = await db.select().from(ledgerTransactions)
    .where(eq(ledgerTransactions.idempotencyKey, idempotencyKey)).limit(1);
  if (!transaction) return null;
  const entries = await db.select().from(ledgerEntries).where(eq(ledgerEntries.transactionId, transaction.id));
  return { transaction, entries, walletUpdates: [] }; // replay path doesn't need walletUpdates — caller already saw them the first time
}

// Any entry posted against a wallet-linked account also updates the wallet's cached
// balanceMinor and appends a wallet_transactions row — same lock pattern
// wallet.service.adminAdjustWallet used before this module existed, generalized here so
// every ledger poster (wallet adjustments, ride fares, subscriptions, ...) shares it.
async function _applyWalletSideEffects(tx, insertedEntries, sourceEntries, referenceType, referenceId) {
  const accountIds = [...new Set(insertedEntries.map((e) => e.accountId))];
  const accounts = await tx.select().from(ledgerAccounts).where(inArray(ledgerAccounts.id, accountIds));
  const walletAccountById = new Map(accounts.filter((a) => a.type === 'wallet').map((a) => [a.id, a]));

  const updates = [];
  for (let i = 0; i < insertedEntries.length; i++) {
    const entry = insertedEntries[i];
    const account = walletAccountById.get(entry.accountId);
    if (!account) continue;
    const {
      reason = 'ledger_posting', description = null, createdBy = null, allowNegative = false,
    } = sourceEntries[i] || {};

    const [wallet] = await tx.select().from(wallets).where(eq(wallets.id, account.walletId)).for('update').limit(1);
    if (!wallet) throw { statusCode: 404, message: `Wallet ${account.walletId} not found` };

    const delta = entry.direction === 'credit' ? entry.amountMinor : -entry.amountMinor;
    const newBalance = wallet.balanceMinor + delta;
    // A negative balance means the owner now owes the platform (e.g. a refund clawing back
    // a fare that was already credited) — legitimate, not an error, when the caller opts in.
    if (newBalance < 0 && !allowNegative) {
      throw { statusCode: 422, message: 'Ledger posting would drive a wallet balance negative' };
    }

    const [updatedWallet] = await tx.update(wallets)
      .set({ balanceMinor: newBalance, updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id)).returning();

    const [walletTxnRow] = await tx.insert(walletTransactions).values({
      walletId: wallet.id,
      type: entry.direction === 'credit' ? 'credit' : 'debit',
      amountMinor: entry.amountMinor,
      balanceAfterMinor: newBalance,
      currencyCode: entry.currencyCode,
      reason, referenceType, referenceId, description, createdBy,
    }).returning();

    updates.push({ wallet: updatedWallet, walletTransaction: walletTxnRow });
  }
  return updates;
}

// ── Admin reads ─────────────────────────────────────────────────────────────────

export async function listTransactions(filters, page, limit, offset) {
  const conditions = [];
  if (filters.businessType)  conditions.push(eq(ledgerTransactions.businessType, filters.businessType));
  if (filters.referenceType) conditions.push(eq(ledgerTransactions.referenceType, filters.referenceType));
  if (filters.referenceId)   conditions.push(eq(ledgerTransactions.referenceId, filters.referenceId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(ledgerTransactions).where(where);
  const rows = await db.select().from(ledgerTransactions).where(where)
    .orderBy(desc(ledgerTransactions.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function getTransaction(id) {
  const [transaction] = await db.select().from(ledgerTransactions).where(eq(ledgerTransactions.id, id)).limit(1);
  if (!transaction) throw { statusCode: 404, message: 'Ledger transaction not found' };
  // Joined with the account so admin reads show a readable code (e.g.
  // 'processor_clearing:razorpay') / wallet reference instead of a bare account UUID.
  const entries = await db.select({
    id: ledgerEntries.id, transactionId: ledgerEntries.transactionId, accountId: ledgerEntries.accountId,
    accountType: ledgerAccounts.type, accountCode: ledgerAccounts.code, walletId: ledgerAccounts.walletId,
    direction: ledgerEntries.direction, amountMinor: ledgerEntries.amountMinor, currencyCode: ledgerEntries.currencyCode,
    createdAt: ledgerEntries.createdAt,
  }).from(ledgerEntries)
    .innerJoin(ledgerAccounts, eq(ledgerEntries.accountId, ledgerAccounts.id))
    .where(eq(ledgerEntries.transactionId, id));
  return { transaction, entries };
}
