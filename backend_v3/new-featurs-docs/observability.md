# Observability & Metrics

> **Priority:** P2 — MEDIUM  
> **Status:** PARTIAL — basic logging exists; structured metrics and alerting are MISSING  
> **Depends on:** all modules

---

## Overview

Every request, event, and background job should carry a correlation ID and emit structured logs. Key business metrics must be emitted as counters/histograms so that operational dashboards and alerts can be built without querying production databases.

---

## Correlation IDs — Required Fields

Every API request, Kafka event, BullMQ job, and WebSocket message must carry:

| Field | Source | Example |
|---|---|---|
| `request_id` | Generated per HTTP request | `req_abc123` |
| `correlation_id` | Propagated from client or generated at API gateway | `cor_xyz789` |
| `user_id` | From JWT | `usr_...` |
| `ride_id` | From request body/params | `rid_...` |
| `driver_id` | From context | `drv_...` |
| `payment_id` | From context | `pay_...` |
| `trace_id` | For distributed tracing (OpenTelemetry) | `trc_...` |
| `session_id` | From auth session | `ses_...` |

These fields must appear in **every log line** as structured JSON fields, not embedded in message strings.

---

## Structured Logging Format

All logs must be JSON-structured:

```json
{
  "timestamp": "2026-09-10T18:30:00.000Z",
  "level": "info",
  "request_id": "req_abc123",
  "correlation_id": "cor_xyz789",
  "user_id": "usr_...",
  "ride_id": "rid_...",
  "driver_id": "drv_...",
  "service": "ride-service",
  "action": "complete_trip",
  "duration_ms": 142,
  "message": "Trip completed successfully"
}
```

**Never log:**
- Raw SQL queries with parameter values
- JWT tokens
- Payment card details
- Raw webhook payloads (log only event type + reference)
- Full user PII in error traces

---

## Key Business Metrics

Implement as Prometheus counters/histograms (or equivalent):

### Ride Metrics

| Metric | Type | Labels |
|---|---|---|
| `rides_created_total` | Counter | city, service_type, ride_mode |
| `rides_completed_total` | Counter | city, service_type |
| `rides_cancelled_total` | Counter | city, cancelled_by, reason |
| `no_driver_found_total` | Counter | city, service_type |
| `quote_to_ride_conversion_rate` | Gauge | city, service_type |

### Dispatch Metrics

| Metric | Type | Labels |
|---|---|---|
| `dispatch_latency_seconds` | Histogram | city, service_type |
| `driver_acceptance_rate` | Gauge | city, service_type |
| `offer_timeout_total` | Counter | city |
| `matching_candidates_found` | Histogram | city |
| `eta_accuracy_seconds` | Histogram | city |

### Payment Metrics

| Metric | Type | Labels |
|---|---|---|
| `payment_attempts_total` | Counter | psp, method, status |
| `payment_success_rate` | Gauge | psp, method |
| `payment_latency_seconds` | Histogram | psp |
| `refund_total` | Counter | reason |
| `chargeback_total` | Counter | — |
| `payout_failure_total` | Counter | provider |
| `webhook_processing_latency_ms` | Histogram | psp, event_type |

### Infrastructure Metrics

| Metric | Type | Labels |
|---|---|---|
| `redis_operation_latency_ms` | Histogram | operation |
| `redis_errors_total` | Counter | operation |
| `db_query_latency_ms` | Histogram | operation |
| `kafka_consumer_lag` | Gauge | topic, consumer_group |
| `websocket_connections` | Gauge | namespace |
| `websocket_disconnects_total` | Counter | namespace, reason |
| `bullmq_job_latency_ms` | Histogram | queue |
| `bullmq_job_failures_total` | Counter | queue |

### Safety / Risk Metrics

| Metric | Type | Labels |
|---|---|---|
| `sos_alerts_total` | Counter | city |
| `ridecheck_alerts_total` | Counter | city, trigger_type |
| `risk_events_total` | Counter | decision, event_type |

---

## Critical Alerts

The following conditions must trigger PagerDuty/OpsGenie alerts:

| Alert | Condition | Severity |
|---|---|---|
| High no-driver rate | `no_driver_found_rate > 20%` for 5 min | HIGH |
| Payment failure spike | `payment_failure_rate > 10%` for 3 min | CRITICAL |
| Dispatch latency spike | `p95 dispatch_latency > 10s` | HIGH |
| GPS stale spike | `stale_gps_drivers / total_online > 15%` | MEDIUM |
| PSP outage | `psp_success_rate < 50%` | CRITICAL |
| Queue backlog | `kafka_consumer_lag > 10000` | HIGH |
| Ledger imbalance | Any `ledger_verification_job` failure | CRITICAL |
| Reconciliation mismatch | Any `reconciliation_mismatch` recorded | HIGH |
| WebSocket mass disconnect | `websocket_disconnects_total` spike | MEDIUM |

---

## Health Check Endpoints

### GET `/health`

Basic liveness check (returns 200).

### GET `/health/ready`

Readiness check — verifies DB, Redis, Kafka connections.

**Response:**
```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "kafka": "ok",
    "bullmq": "ok"
  },
  "timestamp": "2026-09-10T18:30:00Z"
}
```

### GET `/metrics`

Prometheus metrics endpoint (internal, not public).

---

## Distributed Tracing

- Use **OpenTelemetry** SDK.
- Instrument HTTP requests, database queries, Redis calls, Kafka produce/consume, BullMQ jobs.
- Export traces to Jaeger or Tempo.
- Correlation IDs propagated via `traceparent` header (W3C Trace Context).

---

## Dashboard Recommendations

### Operations Dashboard
- Active rides map (live count by city)
- No-driver rate (real-time + 24h trend)
- Driver online count by city
- Dispatch latency P50/P95/P99

### Finance Dashboard
- Payment success rate by PSP
- Refund rate
- Payout queue depth
- Ledger verification status

### Safety Dashboard
- Active SOS alerts
- RideCheck alerts last 24h
- Open safety incidents

---

## Implementation Notes

- Use **pino** (already common in Fastify projects) for structured logging.
- Use **prom-client** for Prometheus metrics.
- Add a request lifecycle hook that injects `request_id` and `correlation_id` into every log line.
- Background jobs must log `job_id`, `queue`, `attempt_number` on every log line.
- Kafka consumers must log `topic`, `partition`, `offset`, `consumer_group`.

---

## Testing Requirements

- Log lines are valid JSON
- `request_id` present in all response headers and logs
- Metrics endpoint returns valid Prometheus format
- Health check returns 503 when DB is down
- Alert fires when no-driver rate exceeds threshold in test environment
