import { timingSafeEqual } from 'crypto';
import { registry } from '../utils/metrics.js';
import { env, isProduction } from '../config/env.js';

function hasMetricsToken(request) {
  const header = request.headers.authorization || '';
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(env.METRICS_TOKEN || '');
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Registers GET /metrics — same registration pattern as Swagger in plugins/index.js.
 * In production it needs `Authorization: Bearer <METRICS_TOKEN>` (and is disabled when no
 * token is configured), so internal counters aren't public.
 */
export async function registerMetrics(app) {
  app.get('/metrics', async (request, reply) => {
    if (isProduction && !hasMetricsToken(request)) {
      return reply.status(404).send({ SUCCESS: false, MESSAGE: 'Not found' });
    }
    reply.header('Content-Type', registry.contentType);
    return registry.metrics();
  });
}
