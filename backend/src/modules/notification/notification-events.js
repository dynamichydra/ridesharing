import { publishEvent, TOPICS } from '../../config/kafka.js';

// Static registry of known event types — not a DB table. This is the single source of truth
// for (a) which {{variables}} a template author can reference for a given eventType (surfaced
// to the portal via GET /notification-templates/events) and (b) publishNotification's default
// channel set. Extend this whenever a new call site is migrated from a hand-rolled
// publishEvent(TOPICS.NOTIF_PUSH, {title, body}) to the template-driven path.
export const NOTIFICATION_EVENTS = {
  PAYMENT_SUCCESS: {
    label: 'Payment received',
    variables: ['amount', 'method'],
    channels: ['push'],
  },
  SUBSCRIPTION_ACTIVATED: {
    label: 'Subscription activated',
    variables: ['planName', 'endDate'],
    channels: ['push', 'email'],
  },
  DOCUMENT_REJECTED: {
    label: 'Document rejected',
    variables: ['reason'],
    channels: ['push', 'sms'],
  },
};

const CHANNEL_TOPICS = {
  push: TOPICS.NOTIF_PUSH,
  sms: TOPICS.NOTIF_SMS,
  email: TOPICS.NOTIF_EMAIL,
};

/**
 * The template-driven replacement for hand-rolling publishEvent(TOPICS.NOTIF_PUSH, {title, body}).
 * Publishes one Kafka message per requested channel carrying `eventType` + `variables` instead
 * of pre-built text — the notification consumer (src/kafka/consumers/index.js) resolves the
 * active notification_templates row for (eventType, channel, audience: userType) and renders it.
 * `channels` defaults to the event's registered default set if omitted.
 */
export async function publishNotification(eventType, { userId, userType, channels, variables = {}, rideId }) {
  const event = NOTIFICATION_EVENTS[eventType];
  const resolvedChannels = channels || event?.channels || ['push'];
  for (const channel of resolvedChannels) {
    const topic = CHANNEL_TOPICS[channel];
    if (!topic) continue;
    await publishEvent(topic, { eventType, userId, userType, variables, rideId });
  }
}
