import { Queue, Worker } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { redis } from '../config/redis.js';
import { db } from '../config/db.js';
import { webhookEvents } from '../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../config/kafka.js';
import { decideWebhookAction } from '../utils/webhook-dedup.js';
import { processWebhookEvent as processRidePaymentWebhook } from '../modules/ride-payment/ride-payment.service.js';
import { processWebhookEvent as processDriverSubscriptionWebhook } from '../modules/subscription/subscription.service.js';
import { processWebhookEvent as processRiderSubscriptionWebhook } from '../modules/rider-subscription/rider-subscription.service.js';
import { processPayoutStatusWebhook } from '../modules/payout/payout.service.js';

const connection = redis;

const DOMAIN_HANDLERS = {
  ride_payment: processRidePaymentWebhook,
  driver_subscription: processDriverSubscriptionWebhook,
  rider_subscription: processRiderSubscriptionWebhook,
  payout: processPayoutStatusWebhook,
};

const JOB_OPTS = { attempts: 5, backoff: { type: 'exponential', delay: 5000 } };

const webhookQueue = new Queue('webhook-processing', { connection });

export async function enqueueWebhookEvent(webhookEventId) {
  await webhookQueue.add('process', { webhookEventId }, JOB_OPTS);
}

// Called from the three webhook routes right after parseAndVerifyWebhook() — dedupes by
// (gateway, eventId, domain) and enqueues async processing, or short-circuits on a
// redelivery. `event` is null when parseAndVerifyWebhook() didn't recognize the event type
// or the gateway isn't configured — nothing to record or process in that case.
export async function receiveWebhookEvent({ gatewayName, domain, rawBody, event }) {
  if (!event) return;

  const [existing] = await db.select().from(webhookEvents).where(and(
    eq(webhookEvents.gateway, gatewayName), eq(webhookEvents.eventId, event.eventId), eq(webhookEvents.domain, domain),
  )).limit(1);
  if (decideWebhookAction(existing) === 'skip') return;

  const [row] = await db.insert(webhookEvents).values({
    gateway: gatewayName, eventId: event.eventId, domain, rawBody, payload: event,
  }).onConflictDoNothing({ target: [webhookEvents.gateway, webhookEvents.eventId, webhookEvents.domain] }).returning();
  if (!row) return; // lost a race to a concurrent delivery of the same event

  await enqueueWebhookEvent(row.id);
}

const webhookWorker = new Worker(
  'webhook-processing',
  async (job) => {
    const { webhookEventId } = job.data;
    const [row] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, webhookEventId)).limit(1);
    if (!row || row.status === 'processed') return; // already handled or missing — nothing to do

    const handler = DOMAIN_HANDLERS[row.domain];
    if (!handler) throw new Error(`No webhook handler registered for domain '${row.domain}'`);

    await db.update(webhookEvents)
      .set({ status: 'processing', attempts: row.attempts + 1, updatedAt: new Date() })
      .where(eq(webhookEvents.id, row.id));

    await handler(row.payload);

    await db.update(webhookEvents)
      .set({ status: 'processed', updatedAt: new Date() })
      .where(eq(webhookEvents.id, row.id));
  },
  { connection },
);

// BullMQ retries automatically (JOB_OPTS above) — this only runs once per attempt, and marks
// the row 'dead_letter' + audit-logs it only on the final attempt, so a transient failure
// (e.g. a momentary DB hiccup) isn't mistaken for a permanent one.
webhookWorker.on('failed', async (job, err) => {
  console.error('[Job] webhook-processing failed:', err.message);
  const { webhookEventId } = job.data;
  const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 1);

  await db.update(webhookEvents)
    .set({ status: isFinalAttempt ? 'dead_letter' : 'failed', lastError: err.message, updatedAt: new Date() })
    .where(eq(webhookEvents.id, webhookEventId));

  if (isFinalAttempt) {
    await publishEvent(TOPICS.AUDIT_LOG, {
      actorType: 'system', action: 'WEBHOOK_DEAD_LETTERED',
      entityType: 'webhook_event', entityId: webhookEventId,
      meta: { error: err.message, attempts: job.attemptsMade },
    });
  }
});
