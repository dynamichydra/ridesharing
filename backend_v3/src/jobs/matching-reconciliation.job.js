import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { runMatchingReconciliation } from '../modules/matching/matching-reconciliation.service.js';

const connection = redis;
export const matchingReconciliationQueue = new Queue('matching-reconciliation', { connection });

export async function scheduleMatchingReconciliation() {
  await matchingReconciliationQueue.obliterate({ force: true }).catch(() => {});
  await matchingReconciliationQueue.add(
    'reconcile-matching',
    {},
    { repeat: { every: 60_000 } } // runs every 60s
  );
  console.log('✅ Matching reconciliation job scheduled (every 60s)');
}

export const matchingReconciliationWorker = new Worker(
  'matching-reconciliation',
  async () => {
    const report = await runMatchingReconciliation().catch((err) => {
      console.error('[Job] runMatchingReconciliation error:', err.message);
      return null;
    });
    if (report && (report.stuckRidesExpired > 0 || report.orphanedLocksReleased > 0)) {
      console.log('[Job] Matching reconciliation cleaned items:', report);
    }
  },
  { connection }
);

matchingReconciliationWorker.on('failed', (job, err) => {
  console.error('[Job] matching-reconciliation failed:', err.message);
});
