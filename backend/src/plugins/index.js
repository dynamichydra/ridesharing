import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';

export async function registerPlugins(app) {
  // Security
  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : true,
    credentials: true,
  });

  // Rate limiting (uses Redis store)
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

  // JWT
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  // File uploads
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

  // Swagger docs
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

  // Global error handler
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
