import { Queue, Worker } from 'bullmq';
import { scheduleRepeating } from './scheduler.js';
import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { redis } from '../config/redis.js';
import { db } from '../config/db.js';
import { outboxEvents } from '../../drizzle/schema/index.js';
import { publishEvent, publishEventStrict, TOPICS } from '../config/kafka.js';

const connection = redis;

const MAX_ATTEMPTS = 8;
const BATCH_SIZE = 100;
const IDLE_DELAY_MS = 1500;
const BUSY_DELAY_MS = 250;
// The shared kafka client (config/kafka.js) retries 10x with its own exponential backoff on
// things like an unroutable topic — that alone can take well over a minute. Since deliver()
// runs one row at a time, without a cap here a single stuck row would stall every other
// pending row behind it for the same amount of time. Racing against this timeout, rather than
// waiting out KafkaJS's own retries, is what keeps one bad event from starving the batch.
const PUBLISH_TIMEOUT_MS = 8000;

function backoffMs(attempts) {
  return Math.min(2 ** attempts * 1000, 5 * 60_000);
}

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// Claims up to BATCH_SIZE due 'pending' rows in one short transaction. FOR UPDATE SKIP LOCKED
// is what makes this safe with multiple relay workers (one per Node instance) running against
// the same table concurrently — two workers can never claim the same row, no Redis lock
// needed. attempts is bumped here, before the Kafka send, so a crash between commit and the
// broker ack is recorded as a used attempt rather than silently forgotten (at-least-once).
async function claimBatch() {
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(outboxEvents)
      .where(and(eq(outboxEvents.status, 'pending'), lte(outboxEvents.availableAt, new Date())))
      .orderBy(outboxEvents.createdAt)
      .limit(BATCH_SIZE)
      .for('update', { skipLocked: true });

    if (rows.length > 0) {
      await tx.update(outboxEvents)
        .set({ attempts: sql`${outboxEvents.attempts} + 1`, updatedAt: new Date() })
        .where(inArray(outboxEvents.id, rows.map((r) => r.id)));
    }
    return rows;
  });
}

// Delivery happens outside the claim transaction — a network call to Kafka shouldn't hold a
// DB row lock open. Ordering: per-aggregate ordering is preserved via the Kafka partition key
// (eventKey ?? aggregateId), same as direct publishEvent() today; there's no cross-aggregate
// global ordering guarantee, matching Kafka's own per-partition-only guarantee.
async function deliver(row) {
  try {
    await withTimeout(
      publishEventStrict(row.topic, row.payload, row.eventKey ?? row.aggregateId),
      PUBLISH_TIMEOUT_MS,
      `publishEvent timed out after ${PUBLISH_TIMEOUT_MS}ms (topic '${row.topic}')`,
    );
    await db.update(outboxEvents)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(outboxEvents.id, row.id));
  } catch (err) {
    if (row.attempts >= MAX_ATTEMPTS) {
      await db.update(outboxEvents)
        .set({ status: 'dead_letter', lastError: err.message, updatedAt: new Date() })
        .where(eq(outboxEvents.id, row.id));
      // Bootstrapping exception: a dead-lettered outbox row can't be reported through the
      // outbox itself (circular), so this one publishes directly, same as
      // ledger-verification.job.js's mismatch alert.
      await publishEvent(TOPICS.AUDIT_LOG, {
        actorType: 'system', action: 'OUTBOX_EVENT_DEAD_LETTERED',
        entityType: row.aggregateType, entityId: row.aggregateId,
        meta: { outboxEventId: row.id, topic: row.topic, error: err.message },
      }).catch((auditErr) => console.error('[Job] outbox-relay: failed to publish dead-letter audit event:', auditErr.message));
    } else {
      await db.update(outboxEvents)
        .set({ lastError: err.message, availableAt: new Date(Date.now() + backoffMs(row.attempts)), updatedAt: new Date() })
        .where(eq(outboxEvents.id, row.id));
    }
  }
}

// Returns true if a full batch was claimed (more work likely waiting), false otherwise —
// used by the worker below to decide whether to re-tick almost immediately or back off.
export async function relayBatch() {
  const claimed = await claimBatch();
  for (const row of claimed) {
    await deliver(row);
  }
  return claimed.length === BATCH_SIZE;
}

const outboxRelayQueue = new Queue('outbox-relay', { connection });

export async function scheduleOutboxRelay() {
  // A single scheduler shared by every instance (a self-re-adding tick used to multiply with
  // each restart once queues were no longer obliterated on boot).
  await scheduleRepeating(outboxRelayQueue, 'tick', { every: IDLE_DELAY_MS });
  console.log('✅ Outbox relay job scheduled');
}

// Each tick keeps draining while full batches come back (busy), up to a bound so one tick
// can't run forever; idle ticks return after one empty claim. Multiple instances are safe —
// claimBatch() uses FOR UPDATE SKIP LOCKED.
const MAX_BATCHES_PER_TICK = 20;
const outboxRelayWorker = new Worker(
  'outbox-relay',
  async () => {
    for (let i = 0; i < MAX_BATCHES_PER_TICK; i++) {
      const full = await relayBatch();
      if (!full) break;
      await new Promise((r) => setTimeout(r, BUSY_DELAY_MS));
    }
  },
  { connection, concurrency: 1 },
);

outboxRelayWorker.on('failed', (job, err) => {
  console.error('[Job] outbox-relay failed:', err.message);
});
