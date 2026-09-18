import { eq, and, gte, lte, inArray, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { payments, reconciliationRuns, reconciliationMismatches, admins } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { getGateway } from '../payment/payment.service.js';
import { sendEmail } from '../../utils/email.js';

// Heuristic thresholds for assessMismatchSeverity() below, in minor currency units — roughly
// ₹5,000/$5,000 and ₹500/$50 respectively. Deliberately currency-agnostic and approximate; the
// point is triage ordering for admins, not a precise financial judgment, so this never needs
// per-currency tuning to be useful.
const HIGH_SEVERITY_MINOR = 500000;
const MEDIUM_SEVERITY_MINOR = 50000;

/**
 * Pure — how much money is plausibly at risk for a given finding, then bucketed into
 * low/medium/high. `duplicate_internal` is always at least 'medium' regardless of amount: it
 * signals a data-integrity bug in our own system (two internal rows for one gateway payment),
 * not just a routine timing drift, so it shouldn't be buried at 'low' just because the amount
 * happens to be small.
 */
export function assessMismatchSeverity(mismatch) {
  const amountAtRisk = mismatch.type === 'amount_mismatch'
    ? Math.abs((mismatch.internalAmountMinor ?? 0) - (mismatch.externalAmountMinor ?? 0))
    : (mismatch.internalAmountMinor ?? mismatch.externalAmountMinor ?? 0);

  if (amountAtRisk >= HIGH_SEVERITY_MINOR) return 'high';
  if (amountAtRisk >= MEDIUM_SEVERITY_MINOR || mismatch.type === 'duplicate_internal') return 'medium';
  return 'low';
}

/**
 * Pure diff — extracted so it's unit-testable without a DB or gateway call. `internal` is our
 * `payments` rows (each `{ gatewayPaymentId, amountMinor, id? }`), `external` is the
 * processor's own transaction list for the same window and gateway
 * (`{ gatewayPaymentId, amountMinor }`). Never mutates or resolves anything — just reports.
 */
export function diffTransactions(internal, external) {
  const mismatches = [];
  const internalByKey = new Map();

  for (const row of internal) {
    if (internalByKey.has(row.gatewayPaymentId)) {
      mismatches.push({
        type: 'duplicate_internal', gatewayPaymentId: row.gatewayPaymentId,
        internalAmountMinor: row.amountMinor, externalAmountMinor: null, paymentId: row.id ?? null,
      });
      continue;
    }
    internalByKey.set(row.gatewayPaymentId, row);
  }

  const seenKeys = new Set();
  for (const ext of external) {
    seenKeys.add(ext.gatewayPaymentId);
    const int = internalByKey.get(ext.gatewayPaymentId);
    if (!int) {
      mismatches.push({
        type: 'missing_internal', gatewayPaymentId: ext.gatewayPaymentId,
        internalAmountMinor: null, externalAmountMinor: ext.amountMinor, paymentId: null,
      });
    } else if (int.amountMinor !== ext.amountMinor) {
      mismatches.push({
        type: 'amount_mismatch', gatewayPaymentId: ext.gatewayPaymentId,
        internalAmountMinor: int.amountMinor, externalAmountMinor: ext.amountMinor, paymentId: int.id ?? null,
      });
    }
  }

  for (const [key, row] of internalByKey) {
    if (!seenKeys.has(key)) {
      mismatches.push({
        type: 'missing_external', gatewayPaymentId: key,
        internalAmountMinor: row.amountMinor, externalAmountMinor: null, paymentId: row.id ?? null,
      });
    }
  }

  return mismatches;
}

export async function runReconciliation({ gatewayName, fromUnix, toUnix }) {
  const gateway = getGateway(gatewayName);
  const external = gatewayName === 'razorpay'
    ? await gateway.listCapturedPayments({ fromUnix, toUnix })
    : await gateway.listBalanceTransactions({ fromUnix, toUnix });

  const fromDate = new Date(fromUnix * 1000);
  const toDate = new Date(toUnix * 1000);
  const internalRows = await db.select({
    id: payments.id, gatewayPaymentId: payments.gatewayPaymentId, amountMinor: payments.amountMinor,
  }).from(payments).where(and(
    eq(payments.gateway, gatewayName),
    inArray(payments.status, ['captured', 'refunded']),
    gte(payments.createdAt, fromDate),
    lte(payments.createdAt, toDate),
  ));

  const mismatches = diffTransactions(internalRows, external);

  const [run] = await db.insert(reconciliationRuns).values({
    gateway: gatewayName, windowFrom: fromDate, windowTo: toDate,
    totalInternal: internalRows.length, totalExternal: external.length,
    mismatchCount: mismatches.length, status: 'completed',
  }).returning();

  if (mismatches.length > 0) {
    const withSeverity = mismatches.map((m) => ({ ...m, runId: run.id, severity: assessMismatchSeverity(m) }));
    await db.insert(reconciliationMismatches).values(withSeverity);
    await publishEvent(TOPICS.AUDIT_LOG, {
      actorType: 'system', action: 'RECONCILIATION_MISMATCH',
      entityType: 'reconciliation_run', entityId: run.id,
      meta: { gateway: gatewayName, mismatchCount: mismatches.length },
    });
    await _alertAdmins(run, withSeverity);
  }

  return run;
}

// Reconciliation has no per-user owner to route through the normal
// publishNotification()/resolveContact() pipeline (that's scoped to driver/rider userTypes) —
// this goes straight to every active admin's email instead, best-effort. A send failure here
// must never fail the reconciliation run itself; same "never take the job down" convention as
// the notification consumer's own per-channel error handling.
async function _alertAdmins(run, mismatchesWithSeverity) {
  try {
    const activeAdmins = await db.select({ email: admins.email }).from(admins).where(eq(admins.isActive, true));
    if (activeAdmins.length === 0) return;

    const highCount = mismatchesWithSeverity.filter((m) => m.severity === 'high').length;
    const subject = `Reconciliation (${run.gateway}): ${mismatchesWithSeverity.length} mismatch(es)${highCount ? `, ${highCount} high-severity` : ''}`;
    const html = `<p>Reconciliation run <strong>${run.id}</strong> for <strong>${run.gateway}</strong> `
      + `found ${mismatchesWithSeverity.length} mismatch(es) (${highCount} high-severity) `
      + `for the window ${run.windowFrom.toISOString()} – ${run.windowTo.toISOString()}.</p>`
      + `<p>Review in the admin portal under Reconciliation → run ${run.id}.</p>`;

    await Promise.all(activeAdmins.map((a) => sendEmail({ to: a.email, subject, html }).catch(() => {})));
  } catch (err) {
    console.error('[Reconciliation] Admin alert email failed:', err.message);
  }
}

// Admin marks a finding reviewed — never auto-applied to any other table.
export async function resolveMismatch(id, { status, notes, resolvedBy }) {
  if (!['resolved', 'ignored'].includes(status)) throw { statusCode: 400, message: 'status must be resolved or ignored' };
  const [mismatch] = await db.update(reconciliationMismatches)
    .set({ status, notes, resolvedBy, resolvedAt: new Date() })
    .where(eq(reconciliationMismatches.id, id)).returning();
  if (!mismatch) throw { statusCode: 404, message: 'Mismatch not found' };
  return mismatch;
}

export async function listRuns(filters, page, limit, offset) {
  const conditions = [];
  if (filters.gateway) conditions.push(eq(reconciliationRuns.gateway, filters.gateway));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(reconciliationRuns).where(where);
  const rows = await db.select().from(reconciliationRuns).where(where)
    .orderBy(desc(reconciliationRuns.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function listMismatches(filters, page, limit, offset) {
  const conditions = [];
  if (filters.runId)    conditions.push(eq(reconciliationMismatches.runId, filters.runId));
  if (filters.status)   conditions.push(eq(reconciliationMismatches.status, filters.status));
  if (filters.severity) conditions.push(eq(reconciliationMismatches.severity, filters.severity));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(reconciliationMismatches).where(where);
  const rows = await db.select().from(reconciliationMismatches).where(where)
    .orderBy(desc(reconciliationMismatches.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}
