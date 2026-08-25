import { registry } from '../utils/metrics.js';

/** Registers GET /metrics — same registration pattern as Swagger in plugins/index.js. */
export async function registerMetrics(app) {
  app.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', registry.contentType);
    return registry.metrics();
  });
}
