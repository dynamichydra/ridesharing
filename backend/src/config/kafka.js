import { Kafka, logLevel } from 'kafkajs';
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
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  AUDIT_LOG: 'audit.log',
};

let _producer = null;

export async function getProducer() {
  if (_producer) return _producer;
  _producer = kafka.producer({ allowAutoTopicCreation: false });
  await _producer.connect();
  console.log('✅ Kafka producer connected');
  return _producer;
}

export async function publishEvent(topic, payload, key) {
  const producer = await getProducer();
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
