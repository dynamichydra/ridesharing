import "dotenv/config";
import Fastify from "fastify";
import { env } from "./config/env.js";
import { redis, redisPub, redisSub } from "./config/redis.js";
import { registerPlugins } from "./plugins/index.js";
import { initSocketIO } from "./sockets/index.js";
import { startAllConsumers } from "./kafka/consumers/index.js";
import { startJobs } from "./jobs/index.js";

import { authRoutes } from "./modules/auth/auth.routes.js";
import { driverRoutes } from "./modules/driver/driver.routes.js";
import { riderRoutes } from "./modules/rider/rider.routes.js";
import { vehicleTypeRoutes } from "./modules/vehicle-type/vehicle-type.routes.js";
import { vehicleModelRoutes } from "./modules/vehicle-model/vehicle-model.routes.js";
import { zoneRoutes } from "./modules/zone/zone.routes.js";
import { fareRoutes } from "./modules/fare/fare.routes.js";
import { commissionRoutes } from "./modules/commission/commission.routes.js";
import {
    bankAccountRoutes,
    adminBankAccountRoutes,
} from "./modules/bank-account/bank-account.routes.js";
import { notificationTemplateRoutes } from "./modules/notification-template/notification-template.routes.js";
import {
    driverNotificationRoutes,
    riderNotificationRoutes,
    adminNotificationRoutes,
} from "./modules/notification/notification-history.routes.js";
import { rideRoutes } from "./modules/ride/ride.routes.js";
import { ridePaymentRoutes } from "./modules/ride-payment/ride-payment.routes.js";
import { subscriptionRoutes } from "./modules/subscription/subscription.routes.js";
import { riderSubscriptionRoutes } from "./modules/rider-subscription/rider-subscription.routes.js";
import { walletRoutes } from "./modules/wallet/wallet.routes.js";
import { ledgerRoutes } from "./modules/ledger/ledger.routes.js";
import { refundRoutes } from "./modules/refund/refund.routes.js";
import { reconciliationRoutes } from "./modules/reconciliation/reconciliation.routes.js";
import { disputeRoutes } from "./modules/dispute/dispute.routes.js";
import { rideDisputeRoutes } from "./modules/ride-dispute/ride-dispute.routes.js";
import { payoutAccountRoutes } from "./modules/payout-account/payout-account.routes.js";
import { payoutRoutes } from "./modules/payout/payout.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { trackingRoutes } from "./modules/tracking/tracking.routes.js";
import { geoRoutes } from "./modules/geo/geo.routes.js";
import { documentsRoutes } from "./modules/documents/documents.routes.js";
import { vehicleRoutes } from "./modules/vehicle/vehicle.routes.js";
import { onboardingRoutes } from "./modules/onboarding/onboarding.routes.js";
import { devStorageRoutes } from "./modules/dev-storage/dev-storage.routes.js";
import { flaggedTripRoutes } from "./modules/trip-gps/flagged-trip.routes.js";
import { promoRoutes } from "./modules/promo/promo.routes.js";
import { emergencyRoutes } from "./modules/emergency/emergency.routes.js";
import { savedPlaceRoutes } from "./modules/saved-place/saved-place.routes.js";
import { moderationRoutes } from "./modules/moderation/moderation.routes.js";

const PORT = parseInt(process.env.PORT || env.PORT || "3000", 10);
const PREFIX = `/api/${env.API_VERSION || "v1"}`;

async function start() {
    const app = Fastify({
        logger: {
            level: env.NODE_ENV === "production" ? "warn" : "info",
        },
        trustProxy: true,
    });

    // 1. Register global plugins (CORS, JWT, Rate Limiting, Swagger)
    await registerPlugins(app);

    // 2. JWT authentication decorator required by auth routes
    app.decorate("authenticate", async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch {
            reply.status(401).send({ SUCCESS: false, MESSAGE: "Unauthorized" });
        }
    });

    // 3. Register Auth module routes
    await app.register(authRoutes, { prefix: `${PREFIX}/auth` });
    await app.register(driverRoutes, { prefix: `${PREFIX}/drivers` });
    await app.register(riderRoutes, { prefix: `${PREFIX}/riders` });
    await app.register(vehicleTypeRoutes, { prefix: `${PREFIX}/vehicle-types` });
    await app.register(vehicleModelRoutes, {
        prefix: `${PREFIX}/vehicle-models`,
    });
    await app.register(zoneRoutes, { prefix: `${PREFIX}/zones` });
    await app.register(fareRoutes, { prefix: `${PREFIX}/fare` });
    await app.register(commissionRoutes, {
        prefix: `${PREFIX}/commission-rules`,
    });
    await app.register(bankAccountRoutes, {
        prefix: `${PREFIX}/driver/bank-details`,
    });
    await app.register(adminBankAccountRoutes, { prefix: `${PREFIX}/admin` });
    await app.register(notificationTemplateRoutes, {
        prefix: `${PREFIX}/notification-templates`,
    });
    await app.register(driverNotificationRoutes, {
        prefix: `${PREFIX}/driver/notifications`,
    });
    await app.register(riderNotificationRoutes, {
        prefix: `${PREFIX}/rider/notifications`,
    });
    await app.register(adminNotificationRoutes, { prefix: `${PREFIX}/admin` });
    await app.register(rideRoutes, { prefix: `${PREFIX}/rides` });
    await app.register(ridePaymentRoutes, { prefix: `${PREFIX}/ride-payments` });
    await app.register(trackingRoutes, { prefix: `${PREFIX}/tracking` });
    await app.register(subscriptionRoutes, { prefix: `${PREFIX}/subscriptions` });
    await app.register(riderSubscriptionRoutes, {
        prefix: `${PREFIX}/rider-plans`,
    });
    await app.register(walletRoutes, { prefix: `${PREFIX}/wallets` });
    await app.register(ledgerRoutes, { prefix: `${PREFIX}/ledger` });
    await app.register(refundRoutes, { prefix: `${PREFIX}/refunds` });
    await app.register(reconciliationRoutes, {
        prefix: `${PREFIX}/reconciliation`,
    });
    await app.register(disputeRoutes, { prefix: `${PREFIX}/disputes` });
    await app.register(rideDisputeRoutes, { prefix: `${PREFIX}/ride-disputes` });
    await app.register(payoutAccountRoutes, {
        prefix: `${PREFIX}/payout-accounts`,
    });
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
    await app.register(moderationRoutes, {
        prefix: `${PREFIX}/admin/moderation`,
    });

    // 4. Base & Health check endpoints
    app.get("/", async () => ({
        SUCCESS: true,
        MESSAGE: "Rideshare API Minimal Test Server is running",
    }));

    app.get("/health", async () => {
        try {
            if (redis.status !== "ready") {
                await redis.connect();
            }

            const pong = await redis.ping();

            return {
                SUCCESS: true,
                REDIS: {
                    status: redis.status,
                    connected: redis.status === "ready",
                    ping: pong,
                },
                MESSAGE: {
                    status: "ok",
                    ts: new Date().toISOString(),
                    version: env.API_VERSION,
                    env: env.NODE_ENV,
                },
            };
        } catch (error) {
            return {
                SUCCESS: false,
                REDIS: {
                    status: redis.status,
                    connected: false,
                    error: error.message,
                    code: error.code,
                },
                MESSAGE: {
                    status: "error",
                    ts: new Date().toISOString(),
                    version: env.API_VERSION,
                    env: env.NODE_ENV,
                },
            };
        }
    });

    app.setNotFoundHandler((request, reply) => {
        reply.status(404).send({
            SUCCESS: false,
            MESSAGE: `Route ${request.method} ${request.url} not found`,
        });
    });
    // Bug 2 fix: pass Fastify's underlying Node.js http.Server — no extra createServer()
    initSocketIO(app.server, app);

    // Connect all Redis clients safely
    try {
        if (redis.status === "wait") await redis.connect();
        if (redisPub.status === "wait") await redisPub.connect();
        if (redisSub.status === "wait") await redisSub.connect();
    } catch (err) {
        app.log.warn(`Redis connection warning: ${err.message}`);
    }
    // 5. Start listening
    try {
        const address = await app.listen({ port: PORT, host: "0.0.0.0" });
        console.log(`🚀 Minimal Server listening on ${address}`);
        console.log(
            `📍 Test endpoint: http://localhost:${PORT}${PREFIX}/auth/driver/mobile/start`,
        );
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }

    // Graceful shutdown handlers
    const shutdown = async (sig) => {
        console.log(`\n[Server] ${sig} — shutting down gracefully...`);
        await app.close();
        process.exit(0);
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

start();

