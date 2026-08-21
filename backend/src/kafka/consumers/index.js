/**
 * Kafka consumers
 *
 * Bug 3 fix: DRIVER_LOCATION payload now always carries {rideId, riderId} (set by
 *            handleDriverLocationUpdate in ride.service) — routing to rider is unconditional.
 * Bug 4 fix: RIDE_MATCHED consumer reads candidate IDs from Redis and joins each driver
 *            to room `ride:candidates:${rideId}` so ride:taken reaches them.
 */

import { kafka, TOPICS } from '../../config/kafka.js';
import { db } from '../../config/db.js';
import { auditLogs, drivers, users, notificationTemplates, notifications } from '../../../drizzle/schema/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import { sendPush } from '../../modules/notification/notification.service.js';
import { sendSms } from '../../utils/sms.js';
import { sendEmail } from '../../utils/email.js';
import { renderTemplate } from '../../utils/renderTemplate.js';

function parse(msg) {
  try { return JSON.parse(msg.value.toString()); } catch { return null; }
}

let _io = null;
export function setSocketIO(io) { _io = io; }
export function getSocketIO() { return _io; }

export function emitToRider(riderId, eventName, payload) {
  if (_io) {
    _io.of('/rider').to(`rider:${riderId}`).emit(eventName, payload);
  }
}

export function emitToRideRoom(rideId, eventName, payload) {
  if (_io) {
    _io.of('/rider').to(`ride:${rideId}`).emit(eventName, payload);
  }
}

// ── Notification ──────────────────────────────────────────────────────────────
// Two payload shapes land here:
//  - Legacy: { title, body, ... } — the ~18 call sites not yet migrated to
//    publishNotification() (notification-events.js). Sent as-is, exactly as before.
//  - Template-driven: { eventType, variables, ... } (no title/body) — resolves the active
//    notification_templates row for (eventType, channel, audience: userType) and renders it.
// Both shapes end up persisted to `notifications` for in-app history, and both silently skip
// (never throw) when there's nowhere to deliver — a missing template or missing contact info
// must never take the consumer down.

const CHANNEL_BY_TOPIC = { [TOPICS.NOTIF_PUSH]: 'push', [TOPICS.NOTIF_SMS]: 'sms', [TOPICS.NOTIF_EMAIL]: 'email' };

async function resolveTemplate(eventType, channel, audience) {
  const base = and(
    eq(notificationTemplates.eventType, eventType),
    eq(notificationTemplates.channel, channel),
    eq(notificationTemplates.isActive, true),
    eq(notificationTemplates.languageCode, 'en'),
  );
  if (audience) {
    const [exact] = await db.select().from(notificationTemplates)
      .where(and(base, eq(notificationTemplates.audience, audience))).limit(1);
    if (exact) return exact;
  }
  const [generic] = await db.select().from(notificationTemplates)
    .where(and(base, isNull(notificationTemplates.audience))).limit(1);
  return generic || null;
}

async function resolveContact(userId, userType, field) {
  const table = userType === 'driver' ? drivers : users;
  const [row] = await db.select({ value: table[field] }).from(table).where(eq(table.id, userId)).limit(1);
  return row?.value || null;
}

async function startNotificationConsumer() {
  const consumer = kafka.consumer({ groupId: 'notification-service' });
  await consumer.connect();
  await consumer.subscribe({ topics: [TOPICS.NOTIF_PUSH, TOPICS.NOTIF_SMS, TOPICS.NOTIF_EMAIL] });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const payload = parse(message);
      if (!payload) return;
      const channel = CHANNEL_BY_TOPIC[topic];
      if (!channel) return;

      let title = payload.title;
      let body = payload.body;

      if (body === undefined && payload.eventType) {
        const template = await resolveTemplate(payload.eventType, channel, payload.userType);
        if (!template) {
          console.warn(`[Notification] No active ${channel} template for event "${payload.eventType}" — skipping.`);
          return;
        }
        title = template.subject ? renderTemplate(template.subject, payload.variables) : undefined;
        body = renderTemplate(template.bodyHtml, payload.variables);
      }
      if (body === undefined) return; // nothing resolvable to send

      if (channel === 'push') {
        let fcmToken = payload.fcmToken;
        if (!fcmToken && payload.userId) {
          fcmToken = await resolveContact(payload.userId, payload.userType, 'fcmToken');
        }
        await sendPush({
          fcmToken, title: title || '', body,
          data: { type: payload.eventType || payload.type || '', rideId: payload.rideId || '' },
        });
      } else if (channel === 'sms') {
        const phone = payload.userId ? await resolveContact(payload.userId, payload.userType, 'phone') : null;
        if (phone) await sendSms(phone, body);
      } else if (channel === 'email') {
        const email = payload.userId ? await resolveContact(payload.userId, payload.userType, 'email') : null;
        if (email) await sendEmail({ to: email, subject: title || 'Notification', html: body });
      }

      if (payload.userId && payload.userType) {
        await db.insert(notifications).values({
          userId: payload.userId, userType: payload.userType,
          eventType: payload.eventType || payload.type || null,
          channel, title: title || null, body,
          data: payload.rideId ? { rideId: payload.rideId } : null,
        }).catch(() => {}); // never crash the consumer over a history-write failure
      }
    },
  });
  console.log('✅ Kafka: notification consumer running');
}

// ── Audit ─────────────────────────────────────────────────────────────────────

async function startAuditConsumer() {
  const consumer = kafka.consumer({ groupId: 'audit-service' });
  await consumer.connect();
  await consumer.subscribe({ topics: [TOPICS.AUDIT_LOG] });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const payload = parse(message);
      if (!payload) return;
      const { _meta, id, ...entry } = payload;
      await db.insert(auditLogs).values({
        actorId: entry.actorId,
        actorType: entry.actorType,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        meta: entry.meta || null,
        ip: entry.ip || null,
        userAgent: entry.userAgent || null,
      }).catch(() => { }); // never crash on audit failure
    },
  });
  console.log('✅ Kafka: audit consumer running');
}

// ── Ride ← → Socket.IO bridge ────────────────────────────────────────────────

async function startRideConsumer() {
  const consumer = kafka.consumer({ groupId: 'ride-socket-bridge' });
  await consumer.connect();
  await consumer.subscribe({
    topics: [
      TOPICS.RIDE_MATCHED,
      TOPICS.RIDE_ACCEPTED,
      TOPICS.RIDE_STARTED,
      TOPICS.RIDE_COMPLETED,
      TOPICS.RIDE_CANCELLED,
      TOPICS.DRIVER_LOCATION,
    ],
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const payload = parse(message);
      if (!payload) { console.warn(`[RideBridge] ${topic} — message failed to parse, skipping`); return; }
      if (!_io) { console.warn(`[RideBridge] ${topic} — Socket.IO not ready yet, dropping message`); return; }

      // ── RIDE_MATCHED — notify each candidate driver ─────────────────────
      if (topic === TOPICS.RIDE_MATCHED) {
        console.log(`[RideBridge] RIDE_MATCHED received for ride ${payload.rideId}, candidates: ${(payload.candidates || []).map((c) => c.driverId).join(', ') || '(none)'}`);
        for (const c of (payload.candidates || [])) {
          const room = `driver:${c.driverId}`;
          const roomSize = _io.of('/driver').adapter.rooms.get(room)?.size || 0;
          console.log(`[RideBridge] emitting ride:new_request to room "${room}" (${roomSize} connected socket(s))`);
          _io.of('/driver').to(`driver:${c.driverId}`).emit('ride:new_request', {
            rideId: payload.rideId,
            ring: payload.ring,
            radiusKm: payload.radiusKm,
            pickupAddress: payload.pickupAddress,
            dropAddress: payload.dropAddress,
            estimatedFare: payload.estimatedFare,
            currency: payload.currency,
            distanceKm: payload.distanceKm,
            polyline: payload.polyline,
            pickupLat: payload.pickupLat,
            pickupLng: payload.pickupLng,
            dropLat: payload.dropLat,
            dropLng: payload.dropLng,
            myDistanceKm: c.distanceKm,
            expiresAt: payload.expiresAt,
          });

          // Bug 4 fix: join driver socket to the candidates room
          // so ride:taken reaches them when another driver accepts
          const sockets = await _io.of('/driver').in(`driver:${c.driverId}`).fetchSockets();
          for (const s of sockets) s.join(`ride:candidates:${payload.rideId}`);
        }
      }

      // ── RIDE_ACCEPTED ──────────────────────────────────────────────────
      if (topic === TOPICS.RIDE_ACCEPTED) {
        // Notify rider
        _io.of('/rider').to(`rider:${payload.riderId}`).emit('ride:driver_assigned', {
          rideId: payload.rideId,
          driver: payload.driver,
          startOtp: payload.startOtp,
        });
        // Bug 4 fix: notify OTHER candidates the ride is taken
        _io.of('/driver').to(`ride:candidates:${payload.rideId}`).emit('ride:taken', {
          rideId: payload.rideId,
        });
      }

      // ── RIDE_STARTED ───────────────────────────────────────────────────
      if (topic === TOPICS.RIDE_STARTED) {
        _io.of('/rider').to(`rider:${payload.riderId}`).emit('ride:started', {
          rideId: payload.rideId,
        });
      }

      // ── RIDE_COMPLETED ─────────────────────────────────────────────────
      if (topic === TOPICS.RIDE_COMPLETED) {
        _io.of('/rider').to(`rider:${payload.riderId}`).emit('ride:completed', {
          rideId: payload.rideId,
          finalFare: payload.finalFare,
          currency: payload.currency,
        });
      }

      // ── RIDE_CANCELLED ─────────────────────────────────────────────────
      if (topic === TOPICS.RIDE_CANCELLED) {
        if (payload.riderId) {
          _io.of('/rider').to(`rider:${payload.riderId}`).emit('ride:cancelled', {
            rideId: payload.rideId,
            reason: payload.reason,
          });
        }
        if (payload.driverId) {
          _io.of('/driver').to(`driver:${payload.driverId}`).emit('ride:cancelled_by_rider', {
            rideId: payload.rideId,
          });
        }
      }

      // ── DRIVER_LOCATION ────────────────────────────────────────────────
      // Bug 3 fix: payload always has riderId (set by handleDriverLocationUpdate)
      // Route to the correct rider without any extra DB lookup here.
      if (topic === TOPICS.DRIVER_LOCATION) {
        const { riderId, rideId, driverId, lat, lng, phase,
          approachRoute, approachProgress, tripProgress } = payload;

        if (!riderId) return; // driver not on a ride — ignore

        const event = {
          rideId,
          driverId,
          lat, lng,
          phase,                   // 'approach' | 'trip'
          approachRoute,           // present when driver just accepted (full route computed)
          approachProgress,        // present on subsequent approach pings
          tripProgress,            // present during started phase
          ts: Date.now(),
        };

        // Push to rider's personal room
        _io.of('/rider').to(`rider:${riderId}`).emit('driver:location', event);
        // Also push to ride room (if rider subscribed via ride:subscribe)
        _io.of('/rider').to(`ride:${rideId}`).emit('driver:location', event);
      }
    },
  });
  console.log('✅ Kafka: ride→socket bridge consumer running');
}

// ── Subscription ──────────────────────────────────────────────────────────────

async function startSubscriptionConsumer() {
  const consumer = kafka.consumer({ groupId: 'subscription-service' });
  await consumer.connect();
  await consumer.subscribe({
    topics: [TOPICS.SUBSCRIPTION_ACTIVATED, TOPICS.SUBSCRIPTION_EXPIRED],
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const payload = parse(message);
      if (!payload) return;
      // Extend here: CRM sync, analytics webhook, Slack alerts, etc.
      console.log(`[Sub] Event ${topic} — driver ${payload.driverId}`);
    },
  });
  console.log('✅ Kafka: subscription consumer running');
}

// ── Boot ──────────────────────────────────────────────────────────────────────

export async function startAllConsumers() {
  await Promise.all([
    startNotificationConsumer(),
    startAuditConsumer(),
    startRideConsumer(),
    startSubscriptionConsumer(),
  ]);
}
