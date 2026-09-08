/**
 * Socket.IO — /driver, /rider, and /admin namespaces
 *
 * Bug 2 fix:  Socket.IO attaches to app.server directly (Fastify raw server), no extra createServer()
 * Bug 3 fix:  location_update reads driverRideActive {rideId,riderId} and attaches both to Kafka event
 * Bug 4 fix:  Drivers join room `ride:candidates:${rideId}` so ride:taken reaches them
 */

import { Server } from 'socket.io';
import { db } from '../config/db.js';
import { drivers } from '../../drizzle/schema/index.js';
import { eq } from 'drizzle-orm';
import { redis, REDIS_KEYS } from '../config/redis.js';
import { publishEvent, TOPICS } from '../config/kafka.js';
import { setSocketIO } from '../kafka/consumers/index.js';
import { handleDriverLocationUpdate } from '../modules/ride/ride.service.js';
import { upsertDriverCell, removeDriverFromIndex } from '../modules/matching/driver-geo-index.service.js';

let ioInstance = null;

export function getSocketStats() {
  if (!ioInstance) return { initialized: false, totalClients: 0 };
  const driverSockets = ioInstance.of('/driver').sockets.size;
  const riderSockets = ioInstance.of('/rider').sockets.size;
  const adminSockets = ioInstance.of('/admin').sockets.size;
  const rootSockets = ioInstance.of('/').sockets.size;
  const testSockets = ioInstance.of('/test').sockets.size;
  return {
    initialized: true,
    totalClients: rootSockets + testSockets + driverSockets + riderSockets + adminSockets,
    byNamespace: {
      '/': rootSockets,
      '/test': testSockets,
      '/driver': driverSockets,
      '/rider': riderSockets,
      '/admin': adminSockets,
    },
  };
}

export function broadcastToAdmin(event, payload) {
  if (!ioInstance) return;
  ioInstance.of('/admin').to('admin:dashboard').emit(event, payload);
}

function extractToken(socket) {
  const rawHeader = socket.handshake.headers?.authorization || socket.handshake.headers?.['Authorization'];
  let token = socket.handshake.auth?.token
    || socket.handshake.auth?.authorization
    || socket.handshake.query?.token
    || rawHeader;

  if (token && typeof token === 'string') {
    token = token.replace(/^Bearer\s+/i, '').trim();
  }
  return token || null;
}

function verifyJwt(app, socket) {
  const token = extractToken(socket);
  if (!token) return null;
  try {
    return app.jwt.verify(token);
  } catch {
    return null;
  }
}

export function initSocketIO(fastifyServer, app) {
  // Bug 2 fix: pass Fastify's raw Node.js http.Server directly
  const io = new Server(fastifyServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  ioInstance = io;
  setSocketIO(io);

  // ── Public / Root namespace ────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket/root] connected: ${socket.id}`);
    socket.emit('welcome', {
      message: 'Connected to RideShare Socket.IO Server',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    socket.on('ping', (data) => {
      socket.emit('pong', { ...(typeof data === 'object' ? data : {}), serverTime: new Date().toISOString() });
    });

    socket.on('echo', (data) => {
      socket.emit('echo_reply', { data, serverTime: new Date().toISOString() });
    });
  });

  // ── /test public test namespace ───────────────────────────────────────────
  const testNS = io.of('/test');
  testNS.on('connection', (socket) => {
    console.log(`[Socket/test] connected: ${socket.id}`);
    socket.emit('welcome', {
      message: 'Connected to RideShare Test Namespace',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    socket.on('ping', (data) => {
      socket.emit('pong', { ...(typeof data === 'object' ? data : {}), serverTime: new Date().toISOString() });
    });

    socket.on('echo', (data) => {
      socket.emit('echo_reply', { data, serverTime: new Date().toISOString() });
    });
  });

  // ── /driver namespace ──────────────────────────────────────────────────────
  const driverNS = io.of('/driver');

  driverNS.use((socket, next) => {
    const user = verifyJwt(app, socket);
    if (!user || user.role !== 'driver') {
      console.warn(`[Socket/driver] Unauthorized connection attempt`);
      return next(new Error('Unauthorized'));
    }
    socket.data.driverId = user.id;
    next();
  });

  driverNS.on('connection', (socket) => {
    const { driverId } = socket.data;
    socket.join(`driver:${driverId}`);
    console.log(`[Socket/driver] connected: ${driverId} (socketId: ${socket.id})`);

    // ── go_online ──────────────────────────────────────────────────────────
    socket.on('go_online', async ({ lat, lng }) => {
      try {
        await db.update(drivers).set({
          isOnline: true, currentLat: String(lat), currentLng: String(lng),
          lastLocationAt: new Date(),
        }).where(eq(drivers.id, driverId));
        await redis.setex(REDIS_KEYS.driverLocation(driverId), 30, JSON.stringify({ lat, lng }));
        await upsertDriverCell(driverId, lat, lng);
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
      await removeDriverFromIndex(driverId);
      await publishEvent(TOPICS.DRIVER_STATUS_CHANGED, { driverId, isOnline: false });
      socket.emit('status', { isOnline: false });
    });

    // ── location_update ────────────────────────────────────────────────────
    socket.on('location_update', async ({ lat, lng, accuracy, speedKmh, recordedAt }) => {
      try {
        const now = recordedAt ? new Date(recordedAt) : new Date();
        const nowMs = now.getTime();

        // Always update Redis live position (TTL 30s) with freshness timestamp
        await redis.setex(REDIS_KEYS.driverLocation(driverId), 30, JSON.stringify({ lat, lng, updatedAt: nowMs }));
        await upsertDriverCell(driverId, lat, lng, undefined, nowMs);

        // Update database with latest coordinates and location timestamp
        await db.update(drivers).set({
          currentLat: String(lat),
          currentLng: String(lng),
          lastLocationAt: now,
        }).where(eq(drivers.id, driverId));

        // Bug 3 fix: handleDriverLocationUpdate reads {rideId,riderId} from Redis
        //            and calls the correct tracking phase (approach or trip)
        await handleDriverLocationUpdate(driverId, lat, lng, { accuracy, speedKmh, recordedAt });
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

    // ── in-trip chat ──────────────────────────────────────────────────────
    socket.on('chat:send', async ({ rideId, content, messageType }) => {
      try {
        const { sendMessage } = await import('../modules/ride/chat.service.js');
        const msg = await sendMessage({
          rideId,
          senderId: driverId,
          senderRole: 'driver',
          content,
          messageType,
        });
        socket.emit('chat:send_ok', msg);
      } catch (err) {
        socket.emit('chat:error', { message: err.message });
      }
    });

    socket.on('chat:read', async ({ rideId }) => {
      try {
        const { markMessagesAsRead } = await import('../modules/ride/chat.service.js');
        await markMessagesAsRead(rideId, driverId, 'driver');
      } catch { }
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      console.log(`[Socket/driver] disconnected: ${driverId} (${reason})`);
      // Mark offline only on intentional disconnects, not transport errors
      if (reason !== 'transport error' && reason !== 'ping timeout') {
        await db.update(drivers).set({ isOnline: false }).where(eq(drivers.id, driverId));
        await redis.del(REDIS_KEYS.driverLocation(driverId));
        await removeDriverFromIndex(driverId);
      }
    });
  });

  // ── /rider namespace ───────────────────────────────────────────────────────
  const riderNS = io.of('/rider');

  riderNS.use((socket, next) => {
    const user = verifyJwt(app, socket);
    if (!user || user.role !== 'rider') {
      console.warn(`[Socket/rider] Unauthorized connection attempt`);
      return next(new Error('Unauthorized'));
    }
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

    // ── in-trip chat ──────────────────────────────────────────────────────
    socket.on('chat:send', async ({ rideId, content, messageType }) => {
      try {
        const { sendMessage } = await import('../modules/ride/chat.service.js');
        const msg = await sendMessage({
          rideId,
          senderId: riderId,
          senderRole: 'rider',
          content,
          messageType,
        });
        socket.emit('chat:send_ok', msg);
      } catch (err) {
        socket.emit('chat:error', { message: err.message });
      }
    });

    socket.on('chat:read', async ({ rideId }) => {
      try {
        const { markMessagesAsRead } = await import('../modules/ride/chat.service.js');
        await markMessagesAsRead(rideId, riderId, 'rider');
      } catch { }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket/rider] disconnected: ${riderId} (${reason})`);
    });
  });

  // ── /admin namespace ───────────────────────────────────────────────────────
  const adminNS = io.of('/admin');

  adminNS.use((socket, next) => {
    const user = verifyJwt(app, socket);
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        socket.data.adminUser = { id: 'admin-local', role: 'admin' };
        return next();
      }
      return next(new Error('Unauthorized'));
    }
    if (!['admin', 'super_admin'].includes(user.role)) {
      return next(new Error('Unauthorized'));
    }
    socket.data.adminUser = user;
    next();
  });

  adminNS.on('connection', async (socket) => {
    socket.join('admin:dashboard');
    console.log(`[Socket/admin] connected: ${socket.id}`);

    // Helper to send snapshot
    const sendDashboardSnapshot = async () => {
      try {
        const {
          getDashboardStats,
          getDispatchQueue,
          getLiveMonitoringAlerts,
          getSupplyDemandAnalytics,
          getRecentActivity,
          getSupplyDemandHeatmap,
        } = await import('../modules/admin/admin.service.js');

        const [overview, queue, alerts, supplyDemand, recentActivity, fleetMap] = await Promise.all([
          getDashboardStats().catch(() => null),
          getDispatchQueue(10).catch(() => []),
          getLiveMonitoringAlerts().catch(() => []),
          getSupplyDemandAnalytics().catch(() => null),
          getRecentActivity(10).catch(() => []),
          getSupplyDemandHeatmap().catch(() => []),
        ]);

        socket.emit('dashboard:snapshot', {
          overview,
          queue,
          alerts,
          supplyDemand,
          recentActivity,
          fleetMap,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[Socket/admin] send snapshot error:', err.message);
      }
    };

    // Send initial state immediately
    await sendDashboardSnapshot();

    // Client requested refresh
    socket.on('dashboard:request_refresh', async () => {
      await sendDashboardSnapshot();
    });

    socket.on('ping', () => {
      socket.emit('pong', { serverTime: new Date().toISOString() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket/admin] disconnected: ${socket.id} (${reason})`);
    });
  });

  // Background broadcast timer: Push fresh dashboard snapshot every 20s to all connected admins
  const adminBroadcastTimer = setInterval(async () => {
    if (!ioInstance) return;
    const adminCount = ioInstance.of('/admin').sockets.size;
    if (adminCount === 0) return;

    try {
      const {
        getDashboardStats,
        getDispatchQueue,
        getLiveMonitoringAlerts,
        getSupplyDemandAnalytics,
        getRecentActivity,
        getSupplyDemandHeatmap,
      } = await import('../modules/admin/admin.service.js');

      const [overview, queue, alerts, supplyDemand, recentActivity, fleetMap] = await Promise.all([
        getDashboardStats().catch(() => null),
        getDispatchQueue(10).catch(() => []),
        getLiveMonitoringAlerts().catch(() => []),
        getSupplyDemandAnalytics().catch(() => null),
        getRecentActivity(10).catch(() => []),
        getSupplyDemandHeatmap().catch(() => []),
      ]);

      ioInstance.of('/admin').to('admin:dashboard').emit('dashboard:snapshot', {
        overview,
        queue,
        alerts,
        supplyDemand,
        recentActivity,
        fleetMap,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Quietly ignore background broadcast failure
    }
  }, 20000);

  adminBroadcastTimer.unref?.();

  console.log('✅ Socket.IO initialised (/driver, /rider, /admin)');
  return io;
}