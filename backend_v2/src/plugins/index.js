import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';

import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { env, isProduction, corsOrigins, apiDocsEnabled } from '../config/env.js';
import { redis } from '../config/redis.js';
import fastifyRawBody from 'fastify-raw-body';
import { registerMetrics } from './metrics.js';

export async function registerPlugins(app) {
  // Raw body — must be registered before JSON parser (needed for Razorpay webhook HMAC)
  await app.register(fastifyRawBody, {
    field: 'rawBody',
    global: false,   // only on routes that opt in via config: { rawBody: true }
    encoding: 'utf8',
    runFirst: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(cors, {
    // No Origin header = native mobile app / server-to-server: always allowed (CORS is a
    // browser control). Browsers: CORS_ORIGINS allow-list; outside production, anything.
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsOrigins.length) return cb(null, corsOrigins.includes(origin));
      return cb(null, !isProduction);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'idempotency-key',
      'X-Idempotency-Key',
      'x-idempotency-key',
      'X-Requested-With',
      'x-requested-with',
      'X-Device-Id',
      'x-device-id',
      'X-Client-Version',
      'x-client-version',
      'X-Request-Id',
      'x-request-id',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    // Shared across instances when Redis is up (server.js connects Redis before plugins);
    // skipOnError keeps the API serving if Redis briefly drops instead of failing every call.
    redis: redis && redis.status === 'ready' ? redis : undefined,
    skipOnError: true,
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => ({
      SUCCESS: false,
      MESSAGE: 'Too many requests, please slow down.',
    }),
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });

  // API docs advertise every route — off in production unless ENABLE_API_DOCS=true.
  if (apiDocsEnabled) {
    await app.register(swagger, {
      openapi: {
        info: { title: 'RideShare API', version: '1.0.0', description: 'Industrial Rideshare Platform' },
        servers: [{ url: env.APP_BASE_URL || `http://localhost:${env.PORT}` }],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
    });
    await app.register(swaggerUI, { routePrefix: '/docs' });
  }

  await registerMetrics(app);

  // A POST/PUT/PATCH without a JSON body leaves request.body undefined, and handlers that
  // destructure it would crash with a 500. Normalise to {} so they return their own 400s.
  app.addHook('preHandler', async (request) => {
    if (request.body == null && ['POST', 'PUT', 'PATCH'].includes(request.method)) request.body = {};
  });

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      SUCCESS: false,
      MESSAGE: env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal server error'
        : error.message,
      ...(typeof error.code === 'string' && statusCode < 500 ? { CODE: error.code } : {}),
    });
  });
}
