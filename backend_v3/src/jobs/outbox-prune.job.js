import { Queue, Worker } from 'bullmq';
import { and, eq, lt } from 'drizzle-orm';
import { redis } from '../config/redis.js';
import { db } from '../config/db.js';
import { outboxEvents } from '../../drizzle/schema/index.js';

const connection = redis;

// Only 'published' rows age out — 'dead_letter' rows are kept indefinitely as evidence of a
// real delivery failure worth investigating, not auto-cleaned like a successfully-delivered row.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const outboxPruneQueue = new Queue('outbox-prune', { connection });

export async function scheduleOutboxPrune() {
  await outboxPruneQueue.obliterate({ force: true }).catch(() => { });
  await outboxPruneQueue.add('prune', {}, { repeat: { pattern: '0 * * * *' } }); // hourly
  console.log('✅ Outbox prune job scheduled (hourly)');
}

const outboxPruneWorker = new Worker(
  'outbox-prune',
  async () => {
    const cutoff = new Date(Date.now() - RETENTION_MS);
    const deleted = await db.delete(outboxEvents)
      .where(and(eq(outboxEvents.status, 'published'), lt(outboxEvents.createdAt, cutoff)))
      .returning({ id: outboxEvents.id });
    console.log(`[Job] outbox-prune removed ${deleted.length} published row(s)`);
  },
  { connection },
);

outboxPruneWorker.on('failed', (job, err) => {
  console.error('[Job] outbox-prune failed:', err.message);
});
