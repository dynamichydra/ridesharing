import 'dotenv/config';
import Fastify from 'fastify';
import { createServer } from 'http';
import { env } from './config/env.js';
import { redis } from './config/redis.js';
import { registerPlugins } from './plugins/index.js';
import { initSocketIO } from './sockets/index.js';
import { startAllConsumers } from './kafka/consumers/index.js';
import { startJobs } from './jobs/index.js';

// ── Route modules ─────────────────────────────────────────────────────────────
import { authRoutes } from './modules/auth/auth.routes.js';
import { driverRoutes } from './modules/driver/driver.routes.js';
import { riderRoutes } from './modules/rider/rider.routes.js';
import { vehicleTypeRoutes } from './modules/vehicle-type/vehicle-type.routes.js';
import { zoneRoutes } from './modules/zone/zone.routes.js';
import { fareRoutes } from './modules/fare/fare.routes.js';
import { rideRoutes } from './modules/ride/ride.routes.js';
import { subscriptionRoutes } from './modules/subscription/subscription.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';

const PREFIX = `/api/${env.API_VERSION}`;

async function build() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'warn' : 'info',
      transport: env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  });

  // ── Plugins (cors, helmet, jwt, rate-limit, swagger) ─────────────────────
  await registerPlugins(app);

  // ── Convenience preHandler decorator ─────────────────────────────────────
  app.decorate('authenticate', async (request, reply) => {
    try { await request.jwtVerify(); }
    catch { reply.status(401).send({ SUCCESS: false, MESSAGE: 'Unauthorized' }); }
  });

  // ── Routes ────────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: `${PREFIX}/auth` });
  await app.register(driverRoutes, { prefix: `${PREFIX}/drivers` });
  await app.register(riderRoutes, { prefix: `${PREFIX}/riders` });
  await app.register(vehicleTypeRoutes, { prefix: `${PREFIX}/vehicle-types` });
  await app.register(zoneRoutes, { prefix: `${PREFIX}/zones` });
  await app.register(fareRoutes, { prefix: `${PREFIX}/fare` });
  await app.register(rideRoutes, { prefix: `${PREFIX}/rides` });
  await app.register(subscriptionRoutes, { prefix: `${PREFIX}/subscriptions` });
  await app.register(adminRoutes, { prefix: `${PREFIX}/admin` });

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', async () => ({
    SUCCESS: true,
    MESSAGE: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: env.API_VERSION,
      env: env.NODE_ENV,
    },
  }));

  // ── Not found handler ──────────────────────────────────────────────────────
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ SUCCESS: false, MESSAGE: `Route ${request.method} ${request.url} not found` });
  });

  return app;
}

async function start() {
  const app = await build();

  // Build raw HTTP server so Socket.IO shares the same port
  const httpServer = createServer(app.server);

  // Wait for Fastify to be ready before attaching Socket.IO
  await app.ready();

  // ── Socket.IO ─────────────────────────────────────────────────────────────
  initSocketIO(app.server, app);

  // ── Redis ─────────────────────────────────────────────────────────────────
  await redis.connect();

  // ── Kafka consumers ───────────────────────────────────────────────────────
  try {
    await startAllConsumers();
  } catch (err) {
    app.log.warn('Kafka consumers failed to start (non-fatal in dev):', err.message);
  }

  // ── BullMQ jobs ───────────────────────────────────────────────────────────
  try {
    await startJobs();
  } catch (err) {
    app.log.warn('BullMQ jobs failed to start (non-fatal in dev):', err.message);
  }

  // ── Listen ────────────────────────────────────────────────────────────────
  await app.listen({ port: parseInt(env.PORT, 10), host: '0.0.0.0' });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[Server] ${signal} received — shutting down...`);
    await app.close();
    await redis.quit();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
