import client from 'prom-client';

/**
 * Central prom-client registry. New instrumentation points import `metrics`
 * from here and call the specific counter/histogram directly — no framework
 * beyond prom-client itself, so this stays cheap to keep alive at hyper-scale.
 */
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const metrics = {
  matchRingDurationSeconds: new client.Histogram({
    name: 'matching_ring_duration_seconds',
    help: 'Time spent per matching ring (query + score + lock + offer + wait)',
    labelNames: ['outcome'], // accepted | timeout | no_candidates
    buckets: [0.5, 1, 2, 5, 10, 15, 20, 25, 30],
    registers: [registry],
  }),
  lockAcquireTotal: new client.Counter({
    name: 'matching_lock_acquire_total',
    help: 'Distributed per-driver offer lock acquisition attempts',
    labelNames: ['result'], // success | contended
    registers: [registry],
  }),
  routingFallbackTotal: new client.Counter({
    name: 'routing_fallback_total',
    help: 'Times routing degraded to the Haversine+flat-speed fallback instead of real Google Maps routing',
    labelNames: ['source'], // route | eta_matrix
    registers: [registry],
  }),
  gpsPingClassifiedTotal: new client.Counter({
    name: 'gps_ping_classified_total',
    help: 'GPS pings classified during trip reconciliation',
    labelNames: ['classification'], // valid | noise | gap
    registers: [registry],
  }),
  fareDeviationFlaggedTotal: new client.Counter({
    name: 'fare_deviation_flagged_total',
    help: 'Completed trips flagged for manual review due to actual-vs-estimate fare deviation',
    registers: [registry],
  }),
  rateCardResolutionTotal: new client.Counter({
    name: 'rate_card_resolution_total',
    help: 'Rate-card resolutions by fallback tier — a rising "global" share means a market is missing a real rate card',
    labelNames: ['tier'], // exact | category | global
    registers: [registry],
  }),
};
