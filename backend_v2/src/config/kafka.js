import { Kafka, Partitioners, logLevel } from 'kafkajs';
import { env } from './env.js';

export const kafka = new Kafka({
  clientId: env.KAFKA_CLIENT_ID,
  brokers: env.KAFKA_BROKERS.split(','),
  logLevel: env.NODE_ENV === 'production' ? logLevel.WARN : logLevel.INFO,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});


export const TOPICS = {
  RIDE_REQUESTED: 'ride.requested',
  RIDE_MATCHED: 'ride.matched',
  RIDE_ACCEPTED: 'ride.accepted',
  RIDE_STARTED: 'ride.started',
  RIDE_COMPLETED: 'ride.completed',
  RIDE_CANCELLED: 'ride.cancelled',
  RIDE_TIMEOUT: 'ride.timeout',
  DRIVER_LOCATION: 'driver.location',
  DRIVER_STATUS_CHANGED: 'driver.status_changed',
  DRIVER_REGISTRATION_SUBMITTED: 'driver.registration_submitted',
  FARE_CALCULATED: 'fare.calculated',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  NOTIF_PUSH: 'notif.push',
  NOTIF_SMS: 'notif.sms',
  NOTIF_EMAIL: 'notif.email',
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  AUDIT_LOG: 'audit.log',
  SUPPORT_TICKET_CREATED: 'support.ticket.created',
  SUPPORT_TICKET_UPDATED: 'support.ticket.updated',
  SUPPORT_MESSAGE_SENT: 'support.message.sent',
  SUPPORT_SLA_BREACHED: 'support.sla.breached',
};


let _producer = null;
// A failed connect is retried after a cooldown rather than disabling Kafka for the life of the
// process — one broker blip at boot used to drop every event until the next restart.
const PRODUCER_RETRY_COOLDOWN_MS = 15_000;
let _producerConnecting = null;
let _nextConnectAttemptAt = 0;

export async function getProducer() {
  if (_producer) return _producer;
  if (Date.now() < _nextConnectAttemptAt) return null;
  if (_producerConnecting) return _producerConnecting;
  _producerConnecting = (async () => {
    const producer = kafka.producer({
      allowAutoTopicCreation: false,
      createPartitioner: Partitioners.DefaultPartitioner,
    });
    try {
      await producer.connect();
      producer.on(producer.events.DISCONNECT, () => { if (_producer === producer) _producer = null; });
      _producer = producer;
      console.log('✅ Kafka producer connected');
      return producer;
    } catch (err) {
      _nextConnectAttemptAt = Date.now() + PRODUCER_RETRY_COOLDOWN_MS;
      console.warn(`[Kafka] Producer connection failed, retrying in ${PRODUCER_RETRY_COOLDOWN_MS / 1000}s: ${err.message}`);
      return null;
    } finally {
      _producerConnecting = null;
    }
  })();
  return _producerConnecting;
}

export function isProducerConnected() {
  return !!_producer;
}

/**
 * Throws when the event could not be handed to Kafka. Use this where the caller must know —
 * the outbox relay (jobs/outbox-relay.job.js) retries the row instead of marking it published.
 */
export async function publishEventStrict(topic, payload, key) {
  const producer = await getProducer();
  if (!producer) throw new Error('Kafka producer is not connected');
  await producer.send({
    topic,
    messages: [{
      key: key ? String(key) : String(payload.id || Date.now()),
      value: JSON.stringify({
        ...payload,
        _meta: { ts: Date.now(), topic, v: 1 },
      }),
    }],
  });
}

/**
 * Best-effort publish for non-critical, fire-and-forget events: never throws, so a Kafka
 * outage can't fail the request that triggered it. Anything that must not be lost should be
 * written to the outbox (utils/outbox.js) inside the domain transaction instead.
 */
export async function publishEvent(topic, payload, key) {
  try {
    await publishEventStrict(topic, payload, key);
  } catch (err) {
    console.warn(`[Kafka] Failed to publish event to topic ${topic}: ${err.message}`);
  }
}

export async function disconnectProducer() {
  const producer = _producer;
  _producer = null;
  if (producer) await producer.disconnect().catch(() => {});
}
