import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { runPayoutBatch } from '../modules/payout/payout.service.js';

const connection = redis;

const payoutBatchQueue = new Queue('payout-batch', { connection });

export async function schedulePayoutBatch() {
  await payoutBatchQueue.obliterate({ force: true }).catch(() => { });
  await payoutBatchQueue.add('run', {}, { repeat: { pattern: '0 3 * * 1' } }); // weekly, Monday 03:00
  console.log('✅ Payout batch job scheduled (weekly, Monday 03:00)');
}

const payoutBatchWorker = new Worker(
  'payout-batch',
  async () => {
    // Only Stripe has real payout execution today — see razorpay.gateway.js payout() and the
    // Phase 4 plan notes on why. runPayoutBatch() itself also no-ops per-gateway when that
    // gateway isn't configured or doesn't support payouts, so this loop is future-proof if a
    // second payout-capable gateway is added later.
    for (const gatewayName of ['stripe']) {
      const result = await runPayoutBatch(gatewayName);
      if (result) {
        console.log(`[Job] Payout batch (${gatewayName}): ${result.driverCount} driver(s), ${result.totalAmountMinor} minor units total.`);
      }
    }
  },
  { connection },
);

payoutBatchWorker.on('failed', (job, err) => {
  console.error('[Job] payout-batch failed:', err.message);
});
