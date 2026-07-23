import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';

import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { env } from '../config/env.js';
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
    origin: env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : true,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
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

  await app.register(swagger, {
    openapi: {
      info: { title: 'RideShare API', version: '1.0.0', description: 'Industrial Rideshare Platform' },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });
  await app.register(swaggerUI, { routePrefix: '/docs' });

  await registerMetrics(app);

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      SUCCESS: false,
      MESSAGE: env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal server error'
        : error.message,
    });
  });
}
