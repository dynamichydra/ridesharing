import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { runReconciliation } from '../modules/reconciliation/reconciliation.service.js';
import { getGateway } from '../modules/payment/payment.service.js';

const connection = redis;

const reconciliationQueue = new Queue('reconciliation', { connection });

export async function scheduleReconciliation() {
  await reconciliationQueue.obliterate({ force: true }).catch(() => { });
  await reconciliationQueue.add('run', {}, { repeat: { pattern: '0 2 * * *' } }); // daily 02:00
  console.log('✅ Reconciliation job scheduled (daily 02:00)');
}

const reconciliationWorker = new Worker(
  'reconciliation',
  async () => {
    const now = new Date();
    const todayStartUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const toUnix = Math.floor(todayStartUtc / 1000);
    const fromUnix = toUnix - 86400; // yesterday's UTC window

    for (const gatewayName of ['razorpay', 'stripe']) {
      const gateway = getGateway(gatewayName);
      if (!gateway.isConfigured) {
        console.log(`[Job] Reconciliation skipped for ${gatewayName} — not configured.`);
        continue;
      }
      const run = await runReconciliation({ gatewayName, fromUnix, toUnix });
      console.log(
        `[Job] Reconciliation (${gatewayName}): ${run.mismatchCount} mismatch(es) across ` +
        `${run.totalInternal} internal / ${run.totalExternal} external records.`,
      );
    }
  },
  { connection },
);

reconciliationWorker.on('failed', (job, err) => {
  console.error('[Job] reconciliation failed:', err.message);
});
