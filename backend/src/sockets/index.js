import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { db } from '../config/db.js';
import { drivers } from '../../drizzle/schema/index.js';
import { eq } from 'drizzle-orm';
import { redis, REDIS_KEYS } from '../config/redis.js';
import { publishEvent, TOPICS } from '../config/kafka.js';
import { setSocketIO } from '../kafka/consumers/index.js';

function verifyJwt(app, token) {
  try { return app.jwt.verify(token); } catch { return null; }
}

export function initSocketIO(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Give Kafka consumers a reference to io so they can emit events
  setSocketIO(io);

  // ── Driver namespace (/driver) ─────────────────────────────────────────────
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
    console.log(`[Socket] Driver connected: ${driverId}`);

    // Driver goes online
    socket.on('go_online', async ({ lat, lng }) => {
      try {
        await db.update(drivers).set({
          isOnline: true, currentLat: String(lat), currentLng: String(lng), lastLocationAt: new Date(),
        }).where(eq(drivers.id, driverId));
        await redis.setex(REDIS_KEYS.driverLocation(driverId), 30, JSON.stringify({ lat, lng }));
        await publishEvent(TOPICS.DRIVER_STATUS_CHANGED, { driverId, isOnline: true, lat, lng });
        socket.emit('status', { isOnline: true });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Driver goes offline
    socket.on('go_offline', async () => {
      await db.update(drivers).set({ isOnline: false }).where(eq(drivers.id, driverId));
      await redis.del(REDIS_KEYS.driverLocation(driverId));
      await publishEvent(TOPICS.DRIVER_STATUS_CHANGED, { driverId, isOnline: false });
      socket.emit('status', { isOnline: false });
    });

    // Real-time location update (throttled on client; we trust ~4s interval)
    socket.on('location_update', async ({ lat, lng }) => {
      await redis.setex(REDIS_KEYS.driverLocation(driverId), 30, JSON.stringify({ lat, lng }));
      await publishEvent(TOPICS.DRIVER_LOCATION, { driverId, lat, lng, ts: Date.now() });
    });

    // Driver accepts ride via socket (alternative to REST)
    socket.on('ride:accept', async ({ rideId }) => {
      try {
        const { acceptRide } = await import('../modules/ride/ride.service.js');
        const ride = await acceptRide(rideId, driverId);
        socket.emit('ride:accept_ok', ride);
      } catch (err) {
        socket.emit('ride:accept_error', { message: err.message });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`[Socket] Driver disconnected: ${driverId}`);
      await db.update(drivers).set({ isOnline: false }).where(eq(drivers.id, driverId));
      await redis.del(REDIS_KEYS.driverLocation(driverId));
    });
  });

  // ── Rider namespace (/rider) ───────────────────────────────────────────────
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
    console.log(`[Socket] Rider connected: ${riderId}`);

    // Rider subscribes to a specific ride's updates
    socket.on('ride:subscribe', ({ rideId }) => {
      socket.join(`ride:${rideId}`);
    });

    socket.on('ride:unsubscribe', ({ rideId }) => {
      socket.leave(`ride:${rideId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Rider disconnected: ${riderId}`);
    });
  });

  console.log('✅ Socket.IO initialized (/driver, /rider namespaces)');
  return io;
}
