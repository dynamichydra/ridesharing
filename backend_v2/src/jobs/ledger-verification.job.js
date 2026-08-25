import { sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import { publishEvent, TOPICS } from '../config/kafka.js';

// Audit backstop, not a correctness dependency — ledgerService.postTransaction already
// enforces both invariants atomically at write time. This just re-derives them from what's
// actually in the DB on a schedule, in case of a bug, a manual data fix, or a bypassed write.

async function findUnbalancedTransactions() {
  return db.execute(sql`
    SELECT transaction_id, currency_code,
      SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE -amount_minor END) AS net_minor
    FROM ledger_entries
    GROUP BY transaction_id, currency_code
    HAVING SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE -amount_minor END) <> 0
  `);
}

async function findWalletBalanceMismatches() {
  return db.execute(sql`
    SELECT la.wallet_id, w.balance_minor AS cached_balance_minor,
      COALESCE(SUM(CASE WHEN le.direction = 'credit' THEN le.amount_minor ELSE -le.amount_minor END), 0) AS ledger_balance_minor
    FROM ledger_accounts la
    JOIN wallets w ON w.id = la.wallet_id
    LEFT JOIN ledger_entries le ON le.account_id = la.id
    WHERE la.type = 'wallet'
    GROUP BY la.wallet_id, w.balance_minor
    HAVING w.balance_minor <> COALESCE(SUM(CASE WHEN le.direction = 'credit' THEN le.amount_minor ELSE -le.amount_minor END), 0)
  `);
}

export async function runLedgerVerification() {
  const [unbalanced, mismatched] = await Promise.all([
    findUnbalancedTransactions(),
    findWalletBalanceMismatches(),
  ]);

  if (unbalanced.length > 0 || mismatched.length > 0) {
    await publishEvent(TOPICS.AUDIT_LOG, {
      actorType: 'system', action: 'LEDGER_VERIFICATION_MISMATCH',
      entityType: 'ledger', entityId: null,
      meta: { unbalancedTransactionCount: unbalanced.length, unbalanced, walletMismatchCount: mismatched.length, mismatched },
    });
  }

  return { unbalancedCount: unbalanced.length, walletMismatchCount: mismatched.length };
}
