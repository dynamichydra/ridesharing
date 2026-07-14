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
import { auditLogs, drivers, users } from '../../../drizzle/schema/index.js';
import { eq } from 'drizzle-orm';
import { sendPush } from '../../modules/notification/notification.service.js';

function parse(msg) {
  try { return JSON.parse(msg.value.toString()); } catch { return null; }
}

let _io = null;
export function setSocketIO(io) { _io = io; }

// ── Notification ──────────────────────────────────────────────────────────────

async function startNotificationConsumer() {
  const consumer = kafka.consumer({ groupId: 'notification-service' });
  await consumer.connect();
  await consumer.subscribe({ topics: [TOPICS.NOTIF_PUSH, TOPICS.NOTIF_SMS] });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const payload = parse(message);
      if (!payload) return;

      if (topic === TOPICS.NOTIF_PUSH) {
        let fcmToken = payload.fcmToken;

        // Resolve FCM token from DB if not in payload
        if (!fcmToken && payload.userId) {
          if (payload.userType === 'driver') {
            const [d] = await db.select({ fcmToken: drivers.fcmToken })
              .from(drivers).where(eq(drivers.id, payload.userId)).limit(1);
            fcmToken = d?.fcmToken;
          } else {
            const [u] = await db.select({ fcmToken: users.fcmToken })
              .from(users).where(eq(users.id, payload.userId)).limit(1);
            fcmToken = u?.fcmToken;
          }
        }

        await sendPush({
          fcmToken,
          title: payload.title,
          body: payload.body,
          data: { type: payload.type || '', rideId: payload.rideId || '' },
        });
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
      if (!payload || !_io) return;

      // ── RIDE_MATCHED — notify each candidate driver ─────────────────────
      if (topic === TOPICS.RIDE_MATCHED) {
        for (const c of (payload.candidates || [])) {
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
