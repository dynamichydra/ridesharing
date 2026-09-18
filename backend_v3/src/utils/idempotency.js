import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.js';
import { idempotencyKeys } from '../../drizzle/schema/index.js';

/**
 * Pure decision function — given the existing idempotency_keys row for a (scope, key) pair
 * (or null if none exists yet), decides what withIdempotency() should do next. Extracted so
 * the branching logic is unit-testable without a DB.
 *   - no row yet        -> 'run'    (caller inserts a pending row and executes fn)
 *   - status='completed'-> 'replay' (caller returns the stored response, fn never runs again)
 *   - status='failed'   -> 'retry'  (the previous attempt errored — safe to re-run fn)
 *   - status='pending'  -> 'reject' (a request with this key is already in flight)
 */
export function decideIdempotencyOutcome(existingRow) {
  if (!existingRow) return { action: 'run' };
  if (existingRow.status === 'completed') return { action: 'replay', response: existingRow.responseSnapshot };
  if (existingRow.status === 'failed') return { action: 'retry' };
  return { action: 'reject' };
}

/**
 * Guarantees fn() runs at most once per (scope, key). `scope` namespaces the key per call
 * site (e.g. 'ride_payment_initiate') so two different endpoints can't collide on a
 * client-supplied key. Required for every payment-initiating request per the exactly-once
 * processing guarantee — see docs/payment ledger design notes.
 */
export async function withIdempotency(scope, key, requesterId, fn) {
  if (!key) throw { statusCode: 400, message: 'Idempotency-Key header is required' };

  const inserted = await db.insert(idempotencyKeys)
    .values({ scope, key, requesterId, status: 'pending' })
    .onConflictDoNothing({ target: [idempotencyKeys.scope, idempotencyKeys.key] })
    .returning();

  if (inserted.length > 0) return _runAndFinalize(scope, key, fn);

  const [existing] = await db.select().from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key))).limit(1);

  const outcome = decideIdempotencyOutcome(existing);
  if (outcome.action === 'replay') return outcome.response;

  if (outcome.action === 'retry') {
    // Compare-and-swap the row back to 'pending' so two concurrent retries can't both
    // re-run fn — only the caller that wins the CAS proceeds.
    const claimed = await db.update(idempotencyKeys)
      .set({ status: 'pending', updatedAt: new Date() })
      .where(and(
        eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key), eq(idempotencyKeys.status, 'failed'),
      )).returning();
    if (claimed.length > 0) return _runAndFinalize(scope, key, fn);
  }

  throw { statusCode: 409, message: 'A request with this idempotency key is already being processed' };
}

async function _runAndFinalize(scope, key, fn) {
  try {
    const result = await fn();
    await db.update(idempotencyKeys)
      .set({ status: 'completed', responseSnapshot: result, updatedAt: new Date() })
      .where(and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key)));
    return result;
  } catch (err) {
    await db.update(idempotencyKeys)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key)));
    throw err;
  }
}
