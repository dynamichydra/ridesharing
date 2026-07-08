import 'dotenv/config';
import Fastify from 'fastify';
import { env } from './config/env.js';
import {
  redis, redisPub,
  redisSub
} from './config/redis.js';
import { registerPlugins } from './plugins/index.js';
import { initSocketIO } from './sockets/index.js';
import { startAllConsumers } from './kafka/consumers/index.js';
import { startJobs } from './jobs/index.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { driverRoutes } from './modules/driver/driver.routes.js';
import { riderRoutes } from './modules/rider/rider.routes.js';
import { vehicleTypeRoutes } from './modules/vehicle-type/vehicle-type.routes.js';
import { zoneRoutes } from './modules/zone/zone.routes.js';
import { fareRoutes } from './modules/fare/fare.routes.js';
import { rideRoutes } from './modules/ride/ride.routes.js';
import { subscriptionRoutes } from './modules/subscription/subscription.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { trackingRoutes } from './modules/tracking/tracking.routes.js';
import { geoRoutes } from './modules/geo/geo.routes.js';
import { documentsRoutes } from './modules/documents/documents.routes.js';
import { vehicleRoutes } from './modules/vehicle/vehicle.routes.js';
import { onboardingRoutes } from './modules/onboarding/onboarding.routes.js';

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

  await registerPlugins(app);

  // JWT preHandler decorator used in auth routes
  app.decorate('authenticate', async (request, reply) => {
    try { await request.jwtVerify(); }
    catch { reply.status(401).send({ SUCCESS: false, MESSAGE: 'Unauthorized' }); }
  });

  // Routes
  await app.register(authRoutes, { prefix: `${PREFIX}/auth` });
  await app.register(driverRoutes, { prefix: `${PREFIX}/drivers` });
  await app.register(riderRoutes, { prefix: `${PREFIX}/riders` });
  await app.register(vehicleTypeRoutes, { prefix: `${PREFIX}/vehicle-types` });
  await app.register(zoneRoutes, { prefix: `${PREFIX}/zones` });
  await app.register(fareRoutes, { prefix: `${PREFIX}/fare` });
  await app.register(rideRoutes, { prefix: `${PREFIX}/rides` });
  await app.register(trackingRoutes, { prefix: `${PREFIX}/tracking` });
  await app.register(subscriptionRoutes, { prefix: `${PREFIX}/subscriptions` });
  await app.register(adminRoutes, { prefix: `${PREFIX}/admin` });
  await app.register(geoRoutes, { prefix: `${PREFIX}/geo` });
  await app.register(documentsRoutes, { prefix: `${PREFIX}/documents` });
  await app.register(vehicleRoutes, { prefix: `${PREFIX}/vehicles` });
  await app.register(onboardingRoutes, { prefix: `${PREFIX}/onboarding` });

  app.get('/health', async () => ({
    SUCCESS: true,
    MESSAGE: { status: 'ok', ts: new Date().toISOString(), version: env.API_VERSION, env: env.NODE_ENV },
  }));

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      SUCCESS: false,
      MESSAGE: `Route ${request.method} ${request.url} not found`,
    });
  });

  return app;
}

async function start() {
  const app = await build();
  await app.ready();

  // Bug 2 fix: pass Fastify's underlying Node.js http.Server — no extra createServer()
  initSocketIO(app.server, app);

  // Connect all Redis clients
  // await redis.connect();
  await redisPub.connect();
  await redisSub.connect();

  // Kafka consumers
  try { await startAllConsumers(); }
  catch (err) { app.log.warn('Kafka consumers failed (non-fatal in dev):', err.message); }

  // BullMQ jobs
  try { await startJobs(); }
  catch (err) { app.log.warn('BullMQ failed (non-fatal in dev):', err.message); }

  await app.listen({ port: parseInt(env.PORT, 10), host: '0.0.0.0' });
  console.log(`🚀 Server listening on port ${env.PORT}`);

  const shutdown = async (sig) => {
    console.log(`\n[Server] ${sig} — shutting down gracefully...`);
    await app.close();
    await redis.quit();
    await redisPub.quit();
    await redisSub.quit();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => { console.error('Fatal startup error:', err); process.exit(1); });
