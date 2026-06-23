import { kafka, TOPICS } from '../../config/kafka.js';
import { db } from '../../config/db.js';
import { auditLogs, drivers, users } from '../../../drizzle/schema/index.js';
import { eq } from 'drizzle-orm';
import { sendPush } from '../../modules/notification/notification.service.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function parse(message) {
  try { return JSON.parse(message.value.toString()); } catch { return null; }
}

// ── Notification consumer ────────────────────────────────────────────────────
// Listens on notif.push and notif.sms topics,
// looks up the FCM token for the target user/driver and sends the push.

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
          data: { type: payload.type, rideId: payload.rideId || '' },
        });
      }
    },
  });
  console.log('✅ Kafka notification consumer running');
}

// ── Audit log consumer ───────────────────────────────────────────────────────

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
      }).catch(() => { }); // non-critical — never crash on audit failure
    },
  });
  console.log('✅ Kafka audit consumer running');
}

// ── Ride consumer ─────────────────────────────────────────────────────────────
// Forwards RIDE_MATCHED events to Socket.IO so each driver's socket room
// receives the new ride request notification in real-time.

let _io = null;
export function setSocketIO(io) { _io = io; }

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

      if (topic === TOPICS.RIDE_MATCHED) {
        // Broadcast new ride request to each candidate driver's socket room
        for (const c of (payload.candidates || [])) {
          _io.of('/driver').to(`driver:${c.driverId}`).emit('ride:new_request', {
            rideId: payload.rideId,
            ring: payload.ring,
            radiusKm: payload.radiusKm,
            pickupAddress: payload.pickupAddress,
            dropAddress: payload.dropAddress,
            estimatedFare: payload.estimatedFare,
            distanceKm: c.distanceKm,
            expiresAt: payload.expiresAt,
          });
        }
      }

      if (topic === TOPICS.RIDE_ACCEPTED) {
        // Tell the rider their driver was found
        _io.of('/rider').to(`rider:${payload.riderId}`).emit('ride:driver_assigned', {
          rideId: payload.rideId,
          driver: payload.driver,
        });
        // Tell other candidate drivers the ride is taken
        _io.of('/driver').to(`ride:candidates:${payload.rideId}`).emit('ride:taken', { rideId: payload.rideId });
      }

      if (topic === TOPICS.RIDE_STARTED) {
        _io.of('/rider').to(`rider:${payload.riderId}`).emit('ride:started', { rideId: payload.rideId });
      }

      if (topic === TOPICS.RIDE_COMPLETED) {
        _io.of('/rider').to(`rider:${payload.riderId}`).emit('ride:completed', {
          rideId: payload.rideId, finalFare: payload.finalFare,
        });
      }

      if (topic === TOPICS.RIDE_CANCELLED) {
        _io.of('/rider').to(`rider:${payload.riderId || ''}`).emit('ride:cancelled', { rideId: payload.rideId });
      }

      if (topic === TOPICS.DRIVER_LOCATION && payload.rideId) {
        // Broadcast live driver location to the rider currently in a ride
        _io.of('/rider').to(`rider:${payload.riderId || ''}`).emit('driver:location', {
          lat: payload.lat, lng: payload.lng,
        });
      }
    },
  });
  console.log('✅ Kafka ride consumer running');
}

// ── Subscription consumer ─────────────────────────────────────────────────────

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
      // Subscription state changes are already handled in the service;
      // this consumer can extend with webhooks, CRM sync, analytics, etc.
      console.log(`[Subscription] Event: ${topic} driver=${payload.driverId}`);
    },
  });
  console.log('✅ Kafka subscription consumer running');
}

// ── Boot all consumers ────────────────────────────────────────────────────────

export async function startAllConsumers() {
  await Promise.all([
    startNotificationConsumer(),
    startAuditConsumer(),
    startRideConsumer(),
    startSubscriptionConsumer(),
  ]);
}
