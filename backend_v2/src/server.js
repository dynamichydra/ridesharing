import 'dotenv/config';
import { pathToFileURL } from 'url';
import Fastify from 'fastify';
import { env, assertRequiredEnv, devToolsEnabled, localStorageEnabled, isProduction } from './config/env.js';
import { isProducerConnected, disconnectProducer } from './config/kafka.js';
import {
  redis, redisPub,
  redisSub
} from './config/redis.js';
import { pool } from './config/db.js';
import { registerPlugins } from './plugins/index.js';
import { initSocketIO, attachRedisAdapter } from './sockets/index.js';
import { startAllConsumers, stopAllConsumers } from './kafka/consumers/index.js';
import { startJobs } from './jobs/index.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/auth/user.routes.js';
import { driverRoutes } from './modules/driver/driver.routes.js';
import { riderRoutes } from './modules/rider/rider.routes.js';
import { vehicleTypeRoutes } from './modules/vehicle-type/vehicle-type.routes.js';
import { vehicleModelRoutes } from './modules/vehicle-model/vehicle-model.routes.js';
import { zoneRoutes } from './modules/zone/zone.routes.js';
import { fareRoutes } from './modules/fare/fare.routes.js';
import { commissionRoutes } from './modules/commission/commission.routes.js';
import { bankAccountRoutes, adminBankAccountRoutes } from './modules/bank-account/bank-account.routes.js';
import { notificationTemplateRoutes } from './modules/notification-template/notification-template.routes.js';
import { driverNotificationRoutes, riderNotificationRoutes, adminNotificationRoutes } from './modules/notification/notification-history.routes.js';
import { rideRoutes } from './modules/ride/ride.routes.js';
import { ridePaymentRoutes } from './modules/ride-payment/ride-payment.routes.js';
import { subscriptionRoutes } from './modules/subscription/subscription.routes.js';
import { riderSubscriptionRoutes } from './modules/rider-subscription/rider-subscription.routes.js';
import { walletRoutes } from './modules/wallet/wallet.routes.js';
import { ledgerRoutes } from './modules/ledger/ledger.routes.js';
import { refundRoutes } from './modules/refund/refund.routes.js';
import { reconciliationRoutes } from './modules/reconciliation/reconciliation.routes.js';
import { disputeRoutes } from './modules/dispute/dispute.routes.js';
import { rideDisputeRoutes } from './modules/ride-dispute/ride-dispute.routes.js';
import { payoutAccountRoutes } from './modules/payout-account/payout-account.routes.js';
import { payoutRoutes } from './modules/payout/payout.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { trackingRoutes } from './modules/tracking/tracking.routes.js';
import { geoRoutes } from './modules/geo/geo.routes.js';
import { documentsRoutes } from './modules/documents/documents.routes.js';
import { vehicleRoutes } from './modules/vehicle/vehicle.routes.js';
import { onboardingRoutes } from './modules/onboarding/onboarding.routes.js';
import { devStorageRoutes } from './modules/dev-storage/dev-storage.routes.js';
import { flaggedTripRoutes } from './modules/trip-gps/flagged-trip.routes.js';
import { promoRoutes } from './modules/promo/promo.routes.js';
import { emergencyRoutes } from './modules/emergency/emergency.routes.js';
import { savedPlaceRoutes } from './modules/saved-place/saved-place.routes.js';
import { moderationRoutes } from './modules/moderation/moderation.routes.js';
import { socketTestRoutes } from './modules/socket-test/socket-test.routes.js';
import { cashRoutes } from './modules/cash/cash.routes.js';
import { financialAuditRoutes } from './modules/ledger/financial-audit.routes.js';
import { publicTripRoutes } from './modules/tracking/public-trip.routes.js';
import { lostItemRoutes } from './modules/ride/lost-item.routes.js';
import { matchingRoutes } from './modules/matching/matching.routes.js';
import { driverGroupRoutes } from './modules/driver-group/driver-group.routes.js';
import { fxRoutes } from './modules/fx/fx.routes.js';
import { supportRoutes } from './modules/support/support.routes.js';
import { paymentMethodRoutes } from './modules/payment-method/payment-method.routes.js';

const PREFIX = `/api/${env.API_VERSION}`;


export async function build() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      // Never write credentials or OTP-bearing bodies to logs.
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-region-token"]'],
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
  await app.register(userRoutes, { prefix: `${PREFIX}/users` });
  await app.register(driverRoutes, { prefix: `${PREFIX}/drivers` });
  await app.register(riderRoutes, { prefix: `${PREFIX}/riders` });
  await app.register(vehicleTypeRoutes, { prefix: `${PREFIX}/vehicle-types` });
  await app.register(vehicleModelRoutes, { prefix: `${PREFIX}/vehicle-models` });
  await app.register(zoneRoutes, { prefix: `${PREFIX}/zones` });
  await app.register(fareRoutes, { prefix: `${PREFIX}/fare` });
  await app.register(commissionRoutes, { prefix: `${PREFIX}/commission-rules` });
  await app.register(bankAccountRoutes, { prefix: `${PREFIX}/driver/bank-details` });
  await app.register(adminBankAccountRoutes, { prefix: `${PREFIX}/admin` });
  await app.register(notificationTemplateRoutes, { prefix: `${PREFIX}/notification-templates` });
  await app.register(driverNotificationRoutes, { prefix: `${PREFIX}/driver/notifications` });
  await app.register(riderNotificationRoutes, { prefix: `${PREFIX}/rider/notifications` });
  await app.register(adminNotificationRoutes, { prefix: `${PREFIX}/admin` });
  await app.register(rideRoutes, { prefix: `${PREFIX}/rides` });
  await app.register(ridePaymentRoutes, { prefix: `${PREFIX}/ride-payments` });
  await app.register(trackingRoutes, { prefix: `${PREFIX}/tracking` });
  await app.register(subscriptionRoutes, { prefix: `${PREFIX}/subscriptions` });
  await app.register(driverGroupRoutes, { prefix: `${PREFIX}/driver-groups` });
  await app.register(riderSubscriptionRoutes, { prefix: `${PREFIX}/rider-plans` });
  await app.register(walletRoutes, { prefix: `${PREFIX}/wallets` });
  await app.register(ledgerRoutes, { prefix: `${PREFIX}/ledger` });
  await app.register(refundRoutes, { prefix: `${PREFIX}/refunds` });
  await app.register(reconciliationRoutes, { prefix: `${PREFIX}/reconciliation` });
  await app.register(disputeRoutes, { prefix: `${PREFIX}/disputes` });
  await app.register(rideDisputeRoutes, { prefix: `${PREFIX}/ride-disputes` });
  await app.register(payoutAccountRoutes, { prefix: `${PREFIX}/payout-accounts` });
  await app.register(payoutRoutes, { prefix: `${PREFIX}/payouts` });
  await app.register(adminRoutes, { prefix: `${PREFIX}/admin` });
  await app.register(geoRoutes, { prefix: `${PREFIX}/geo` });
  await app.register(documentsRoutes, { prefix: `${PREFIX}/documents` });
  await app.register(vehicleRoutes, { prefix: `${PREFIX}/vehicles` });
  await app.register(onboardingRoutes, { prefix: `${PREFIX}/onboarding` });
  if (localStorageEnabled) await app.register(devStorageRoutes, { prefix: `${PREFIX}/dev-storage` });
  await app.register(flaggedTripRoutes, { prefix: `${PREFIX}/flagged-trips` });
  await app.register(promoRoutes, { prefix: `${PREFIX}/promos` });
  await app.register(emergencyRoutes, { prefix: `${PREFIX}` });
  await app.register(savedPlaceRoutes, { prefix: `${PREFIX}/saved-places` });
  await app.register(moderationRoutes, { prefix: `${PREFIX}/admin/moderation` });
  // Socket test UIs + /socket-test/quick-auth (mints tokens for real accounts) — dev only.
  if (devToolsEnabled) {
    await app.register(socketTestRoutes, { prefix: `${PREFIX}` });
    await app.register(socketTestRoutes); // also accessible at /socket-test and /socket-test/ui
  }
  await app.register(cashRoutes, { prefix: `${PREFIX}/cash` });
  await app.register(financialAuditRoutes, { prefix: `${PREFIX}/financial-audit` });
  await app.register(publicTripRoutes, { prefix: `${PREFIX}/public` });
  await app.register(lostItemRoutes, { prefix: `${PREFIX}/lost-items` });
  await app.register(matchingRoutes, { prefix: `${PREFIX}/matching` });
  await app.register(fxRoutes, { prefix: `${PREFIX}/fx` });
  await app.register(supportRoutes, { prefix: `${PREFIX}/support` });
  await app.register(paymentMethodRoutes, { prefix: `${PREFIX}/payment-methods` });






  // Liveness: the process is up. Use /ready for load-balancer / orchestrator readiness.
  app.get('/health', async () => ({
    SUCCESS: true,
    MESSAGE: { status: 'ok', ts: new Date().toISOString(), version: env.API_VERSION, env: env.NODE_ENV },
  }));

  // Readiness: only route traffic here when the database and Redis answer.
  // Each check is time-boxed: with Redis down, ioredis queues commands indefinitely.
  const withTimeout = (promise, ms = 2000) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
  app.get('/ready', async (request, reply) => {
    const checks = {};
    try { await withTimeout(pool.query('SELECT 1')); checks.database = 'ok'; } catch { checks.database = 'down'; }
    try {
      if (redis.status !== 'ready') throw new Error('not connected');
      await withTimeout(redis.ping());
      checks.redis = 'ok';
    } catch { checks.redis = 'down'; }
    checks.kafka = isProducerConnected() ? 'ok' : 'degraded'; // events are queued in the outbox meanwhile
    const ready = checks.database === 'ok' && checks.redis === 'ok';
    return reply.status(ready ? 200 : 503).send({ SUCCESS: ready, MESSAGE: { status: ready ? 'ready' : 'not_ready', checks } });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      SUCCESS: false,
      MESSAGE: `Route ${request.method} ${request.url} not found`,
    });
  });

  // Bug 2 fix: pass Fastify's underlying Node.js http.Server and attach Socket.IO routes
  initSocketIO(app.server, app);

  return app;
}

async function start() {
  assertRequiredEnv(); // refuse to boot without required/safe secrets

  // Redis first: the rate limiter (plugins/index.js) only shares its counters across
  // instances if Redis is already connected when it registers.
  try {
    if (redis.status === 'wait') await redis.connect();
    if (redisPub.status === 'wait') await redisPub.connect();
    if (redisSub.status === 'wait') await redisSub.connect();
  } catch (err) {
    if (isProduction) throw new Error(`Redis is required in production: ${err.message}`);
    console.warn(`Redis connection warning: ${err.message}`);
  }

  const app = await build();
  await app.ready();

  try { await attachRedisAdapter(); }
  catch (err) { app.log.warn(`Socket.IO Redis adapter not attached (single-instance only): ${err.message}`); }

  // Kafka consumers
  try { await startAllConsumers(); }
  catch (err) { app.log.warn(`Kafka consumers failed (non-fatal in dev): ${err.message}`); }

  // BullMQ jobs
  try { await startJobs(); }
  catch (err) { app.log.warn(`BullMQ failed (non-fatal in dev): ${err.message}`); }

  await app.listen({ port: parseInt(env.PORT, 10), host: '0.0.0.0' });
  console.log(`🚀 Server listening on port ${env.PORT}`);

  let shuttingDown = false;
  const shutdown = async (sig, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[Server] ${sig} — shutting down gracefully...`);
    // Hard stop if something hangs, so the orchestrator can replace the instance.
    setTimeout(() => process.exit(exitCode || 1), 15_000).unref();
    await app.close().catch(() => { });
    await stopAllConsumers().catch(() => { });
    await disconnectProducer().catch(() => { });
    await redis.quit().catch(() => { });
    await redisPub.quit().catch(() => { });
    await redisSub.quit().catch(() => { });
    await pool.end().catch(() => { });
    process.exit(exitCode);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
  });
  // State after an uncaught exception is unknown — exit and let the orchestrator restart.
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception — exiting:', err);
    shutdown('uncaughtException', 1);
  });
}

// Only boot when run directly (node src/server.js) — importing build() for tests/smoke checks
// must not start listeners, consumers or workers.
// Under Phusion Passenger (Plesk), argv[1] is Passenger's own loader script, not this file,
// so the direct-run check alone never fires and the app never calls listen() → spawn timeout.
const runDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
const underPassenger = typeof globalThis.PhusionPassenger !== 'undefined' || !!process.env.PASSENGER_APP_ENV;
if (runDirectly || underPassenger) {
  start().catch((err) => { console.error('Fatal startup error:', err); process.exit(1); });
}
