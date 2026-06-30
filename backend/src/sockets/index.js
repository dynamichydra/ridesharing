/**
 * Socket.IO — /driver and /rider namespaces
 *
 * Bug 2 fix:  Socket.IO attaches to app.server directly (Fastify raw server), no extra createServer()
 * Bug 3 fix:  location_update reads driverRideActive {rideId,riderId} and attaches both to Kafka event
 * Bug 4 fix:  Drivers join room `ride:candidates:${rideId}` so ride:taken reaches them
 */

import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { db } from '../config/db.js';
import { drivers } from '../../drizzle/schema/index.js';
import { eq } from 'drizzle-orm';
import { redis, REDIS_KEYS } from '../config/redis.js';
import { publishEvent, TOPICS } from '../config/kafka.js';
import { setSocketIO } from '../kafka/consumers/index.js';
import { handleDriverLocationUpdate } from '../modules/ride/ride.service.js';

function verifyJwt(app, token) {
  try { return app.jwt.verify(token); } catch { return null; }
}

export function initSocketIO(fastifyServer, app) {
  // Bug 2 fix: pass Fastify's raw Node.js http.Server directly
  const io = new Server(fastifyServer, {
    cors: {
      origin: env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  setSocketIO(io);

  // ── /driver namespace ──────────────────────────────────────────────────────
  const driverNS = io.of('/driver');

  driverNS.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const user = verifyJwt(app, token);
    if (!user || user.role !== 'driver') return next(new Error('Unauthorized'));
    socket.data.driverId = user.id;
    next();
  });

  driverNS.on('connection', (socket) => {
    const { driverId } = socket.data;
    socket.join(`driver:${driverId}`);
    console.log(`[Socket/driver] connected: ${driverId}`);

    // ── go_online ──────────────────────────────────────────────────────────
    socket.on('go_online', async ({ lat, lng }) => {
      try {
        await db.update(drivers).set({
          isOnline: true, currentLat: String(lat), currentLng: String(lng),
          lastLocationAt: new Date(),
        }).where(eq(drivers.id, driverId));
        await redis.setex(REDIS_KEYS.driverLocation(driverId), 30, JSON.stringify({ lat, lng }));
        await publishEvent(TOPICS.DRIVER_STATUS_CHANGED, { driverId, isOnline: true, lat, lng });
        socket.emit('status', { isOnline: true });
      } catch (err) {
        console.error('[Socket/driver] go_online error:', err);
        socket.emit('error', { message: err.message });
      }
    });

    // ── go_offline ─────────────────────────────────────────────────────────
    socket.on('go_offline', async () => {
      await db.update(drivers).set({ isOnline: false }).where(eq(drivers.id, driverId));
      await redis.del(REDIS_KEYS.driverLocation(driverId));
      await publishEvent(TOPICS.DRIVER_STATUS_CHANGED, { driverId, isOnline: false });
      socket.emit('status', { isOnline: false });
    });

    // ── location_update ────────────────────────────────────────────────────
    // Bug 3 fix: attach rideId + riderId from Redis so Kafka consumer can
    //            route this to the correct rider without a DB lookup.
    socket.on('location_update', async ({ lat, lng }) => {
      try {
        // Always update Redis live position (TTL 30s)
        await redis.setex(REDIS_KEYS.driverLocation(driverId), 30, JSON.stringify({ lat, lng }));

        // Bug 3 fix: handleDriverLocationUpdate reads {rideId,riderId} from Redis
        //            and calls the correct tracking phase (approach or trip)
        await handleDriverLocationUpdate(driverId, lat, lng);

        // Also write to DB every ~30s by letting Redis expire as the signal
        // (a BullMQ job can batch-flush; here we just keep Redis fresh)
      } catch (err) {
        console.error('[Socket/driver] location_update error:', err.message);
      }
    });

    // ── ride:accept (socket shortcut — also available via REST) ───────────
    socket.on('ride:accept', async ({ rideId }) => {
      try {
        const { acceptRide } = await import('../modules/ride/ride.service.js');
        const ride = await acceptRide(rideId, driverId);

        // Bug 4 fix: signal accepted via pub/sub so matching loop aborts immediately
        const { signalRideAccepted } = await import('../modules/matching/matching.service.js');
        await signalRideAccepted(rideId);

        socket.emit('ride:accept_ok', { rideId, status: ride.status });
      } catch (err) {
        socket.emit('ride:accept_error', { message: err.message });
      }
    });

    // ── ride:decline ───────────────────────────────────────────────────────
    socket.on('ride:decline', async ({ rideId, reason }) => {
      try {
        const { declineOffer } = await import('../modules/ride/ride.service.js');
        await declineOffer(rideId, driverId, reason);
      } catch (err) {
        // Non-fatal — offer may have already expired/superseded; still leave the room
        console.warn('[Socket/driver] decline:', err.message);
      }
      socket.leave(`ride:candidates:${rideId}`);
      socket.emit('ride:decline_ok', { rideId });
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      console.log(`[Socket/driver] disconnected: ${driverId} (${reason})`);
      // Mark offline only on intentional disconnects, not transport errors
      if (reason !== 'transport error' && reason !== 'ping timeout') {
        await db.update(drivers).set({ isOnline: false }).where(eq(drivers.id, driverId));
        await redis.del(REDIS_KEYS.driverLocation(driverId));
      }
    });
  });

  // ── /rider namespace ───────────────────────────────────────────────────────
  const riderNS = io.of('/rider');

  riderNS.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const user = verifyJwt(app, token);
    if (!user || user.role !== 'rider') return next(new Error('Unauthorized'));
    socket.data.riderId = user.id;
    next();
  });

  riderNS.on('connection', (socket) => {
    const { riderId } = socket.data;
    socket.join(`rider:${riderId}`);
    console.log(`[Socket/rider] connected: ${riderId}`);

    socket.on('ride:subscribe', ({ rideId }) => {
      socket.join(`ride:${rideId}`);
      socket.emit('ride:subscribed', { rideId });
    });

    socket.on('ride:unsubscribe', ({ rideId }) => {
      socket.leave(`ride:${rideId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket/rider] disconnected: ${riderId} (${reason})`);
    });
  });

  console.log('✅ Socket.IO initialised (/driver, /rider)');
  return io;
}