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
  await app.register(devStorageRoutes, { prefix: `${PREFIX}/dev-storage` });
  await app.register(flaggedTripRoutes, { prefix: `${PREFIX}/flagged-trips` });
  await app.register(promoRoutes, { prefix: `${PREFIX}/promos` });
  await app.register(emergencyRoutes, { prefix: `${PREFIX}` });
  await app.register(savedPlaceRoutes, { prefix: `${PREFIX}/saved-places` });
  await app.register(moderationRoutes, { prefix: `${PREFIX}/admin/moderation` });
  await app.register(socketTestRoutes, { prefix: `${PREFIX}` });
  await app.register(socketTestRoutes); // also accessible at /socket-test and /socket-test/ui





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

  // Connect all Redis clients safely
  try {
    if (redis.status === 'wait') await redis.connect();
    if (redisPub.status === 'wait') await redisPub.connect();
    if (redisSub.status === 'wait') await redisSub.connect();
  } catch (err) {
    app.log.warn(`Redis connection warning: ${err.message}`);
  }

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
