import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { expireOverdueSubscriptions } from '../modules/subscription/subscription.service.js';

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

export async function startJobs() {
  await scheduleSubscriptionExpiry();
  console.log('✅ BullMQ workers running');
}
