import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { expireOverdueSubscriptions } from '../modules/subscription/subscription.service.js';
import { flushRidePings, listActiveGpsRides } from '../modules/trip-gps/gps-ping.service.js';
import { runLedgerVerification } from './ledger-verification.job.js';
import { scheduleReconciliation } from './reconciliation.job.js';
import { schedulePayoutBatch } from './payout-batch.job.js';
import { scheduleOutboxRelay } from './outbox-relay.job.js';
import { scheduleOutboxPrune } from './outbox-prune.job.js';
import './webhook-processing.job.js'; // side-effect import — registers its own Queue/Worker

const connection = redis;

// ── Subscription expiry job ───────────────────────────────────────────────────

const subscriptionQueue = new Queue('subscription-expiry', { connection });

export async function scheduleSubscriptionExpiry() {
  // Remove old repeatable job if exists, then add fresh
  await subscriptionQueue.obliterate({ force: true }).catch(() => { });
  await subscriptionQueue.add(
    'check-expiry',
    {},
    { repeat: { pattern: '0 0 * * *' } }, // midnight every day
  );
  console.log('✅ Subscription expiry job scheduled (daily midnight)');
}

const subscriptionWorker = new Worker(
  'subscription-expiry',
  async () => {
    console.log('[Job] Running subscription expiry check...');
    const result = await expireOverdueSubscriptions();
    console.log(`[Job] Expired ${result.expiredCount} subscriptions`);
  },
  { connection },
);

subscriptionWorker.on('failed', (job, err) => {
  console.error('[Job] subscription-expiry failed:', err.message);
});

// ── Ride timeout job ──────────────────────────────────────────────────────────
// Used externally to schedule per-ride timeouts if needed (matching handles
// its own timeouts, but this queue is available for other timeout use-cases).

export const rideTimeoutQueue = new Queue('ride-timeout', { connection });

const rideTimeoutWorker = new Worker(
  'ride-timeout',
  async (job) => {
    const { rideId } = job.data;
    console.log(`[Job] Ride timeout check for ${rideId}`);
    // matching._waitForAcceptance handles expiry itself; this is a safety net
  },
  { connection },
);

rideTimeoutWorker.on('failed', (job, err) => {
  console.error('[Job] ride-timeout failed:', err.message);
});

// ── GPS ping flush job ────────────────────────────────────────────────────────
// Periodically drains every in-progress trip's Redis ping buffer into
// trip_gps_pings, so a long-running trip's buffer doesn't grow unbounded in
// Redis and billing-relevant data survives a mid-trip restart. The trip-end
// finalize job (trip-gps/finalize-trip.job.js) does one last flush of its own
// to catch anything buffered since the last periodic run.

const gpsFlushQueue = new Queue('gps-ping-flush', { connection });

export async function scheduleGpsFlush() {
  await gpsFlushQueue.obliterate({ force: true }).catch(() => { });
  await gpsFlushQueue.add('flush-active-trips', {}, { repeat: { every: 60_000 } }); // every 60s
  console.log('✅ GPS ping flush job scheduled (every 60s)');
}

const gpsFlushWorker = new Worker(
  'gps-ping-flush',
  async () => {
    const rideIds = await listActiveGpsRides();
    for (const rideId of rideIds) {
      await flushRidePings(rideId).catch((err) =>
        console.error(`[Job] flushRidePings failed for ride ${rideId}:`, err.message),
      );
    }
  },
  { connection },
);

gpsFlushWorker.on('failed', (job, err) => {
  console.error('[Job] gps-ping-flush failed:', err.message);
});

// ── Ledger verification job ───────────────────────────────────────────────────
// Audit backstop — re-derives balance invariants ledgerService.postTransaction already
// enforces atomically at write time, and flags (doesn't auto-correct) any mismatch.

const ledgerVerificationQueue = new Queue('ledger-verification', { connection });

export async function scheduleLedgerVerification() {
  await ledgerVerificationQueue.obliterate({ force: true }).catch(() => { });
  await ledgerVerificationQueue.add('verify', {}, { repeat: { pattern: '0 * * * *' } }); // hourly
  console.log('✅ Ledger verification job scheduled (hourly)');
}

const ledgerVerificationWorker = new Worker(
  'ledger-verification',
  async () => {
    const result = await runLedgerVerification();
    if (result.unbalancedCount > 0 || result.walletMismatchCount > 0) {
      console.warn('[Job] Ledger verification found mismatches:', result);
    } else {
      console.log('[Job] Ledger verification OK');
    }
  },
  { connection },
);

ledgerVerificationWorker.on('failed', (job, err) => {
  console.error('[Job] ledger-verification failed:', err.message);
});

import { dispatchDueScheduledRides } from './scheduled-ride-dispatch.job.js';
import { checkDocumentExpirations } from './document-expiry.job.js';

// ── Document Expiry Job ───────────────────────────────────────────────────────

const documentExpiryQueue = new Queue('document-expiry', { connection });

export async function scheduleDocumentExpiry() {
  await documentExpiryQueue.obliterate({ force: true }).catch(() => { });
  await documentExpiryQueue.add('check-doc-expirations', {}, { repeat: { pattern: '0 1 * * *' } }); // 1 AM daily
  console.log('✅ Document expiry check job scheduled (daily at 01:00)');
}

const documentExpiryWorker = new Worker(
  'document-expiry',
  async () => {
    await checkDocumentExpirations().catch((err) =>
      console.error('[Job] checkDocumentExpirations failed:', err.message),
    );
  },
  { connection },
);

documentExpiryWorker.on('failed', (job, err) => {
  console.error('[Job] document-expiry failed:', err.message);
});

// ── Scheduled ride dispatch job ───────────────────────────────────────────────

const scheduledRideDispatchQueue = new Queue('scheduled-ride-dispatch', { connection });

export async function scheduleScheduledRideDispatch() {
  await scheduledRideDispatchQueue.obliterate({ force: true }).catch(() => { });
  await scheduledRideDispatchQueue.add('dispatch-due-rides', {}, { repeat: { every: 30_000 } }); // every 30s
  console.log('✅ Scheduled ride dispatch job scheduled (every 30s)');
}

const scheduledRideDispatchWorker = new Worker(
  'scheduled-ride-dispatch',
  async () => {
    await dispatchDueScheduledRides().catch((err) =>
      console.error('[Job] dispatchDueScheduledRides failed:', err.message),
    );
  },
  { connection },
);

scheduledRideDispatchWorker.on('failed', (job, err) => {
  console.error('[Job] scheduled-ride-dispatch failed:', err.message);
});

import { scheduleMatchingReconciliation } from './matching-reconciliation.job.js';

export async function startJobs() {
  await scheduleSubscriptionExpiry();
  await scheduleGpsFlush();
  await scheduleLedgerVerification();
  await scheduleReconciliation();
  await schedulePayoutBatch();
  await scheduleOutboxRelay();
  await scheduleOutboxPrune();
  await scheduleScheduledRideDispatch();
  await scheduleDocumentExpiry();
  await scheduleMatchingReconciliation();
  console.log('✅ BullMQ workers running');
}
