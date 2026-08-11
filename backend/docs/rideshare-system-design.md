# Rideshare Platform (Uber/Lyft-style) — Complete System Design

---

## 1. Problem Statement

Design a rideshare platform that connects **Riders** who need to travel from point A to point B with **Drivers** who provide the ride, handling matching, real-time tracking, pricing, payments, and trip lifecycle at global scale (millions of concurrent users, sub-second matching).

---

## 2. Requirements

### 2.1 Functional Requirements

**Rider-facing**
1. Sign up / login (phone OTP)
2. Set pickup and drop-off location (search, pin-drop, current GPS location)
3. View fare estimate before booking (multiple ride types: Economy, XL, Premium, Pool/Shared)
4. Request a ride and get matched with a nearby driver
5. View driver details (name, photo, vehicle, plate number, rating) once matched
6. Real-time tracking of driver approaching pickup, and of the trip in progress on a map
7. Cancel ride (with cancellation policy/fee after grace period)
8. In-app chat / masked calling with driver
9. Multiple payment methods (card, wallet, cash, UPI, corporate billing)
10. Fare split with other riders (for shared rides)
11. Trip receipt after ride completion
12. Rate driver and leave feedback after trip
13. View ride history
14. Schedule a ride in advance
15. SOS / emergency button, share trip status with trusted contacts
16. Promo codes / referral credits
17. Saved places (home, work, favorites)

**Driver-facing**
1. Sign up with document verification (license, vehicle registration, insurance, background check)
2. Go online/offline (availability toggle)
3. Receive ride requests with accept/reject/timeout (limited seconds to respond)
4. Navigation to pickup and to destination (turn-by-turn)
5. Start/end trip controls, OTP or code verification of correct rider at pickup
6. View earnings, trip history, incentives/bonuses
7. Accept cash or in-app payment
8. Rate rider
9. Toggle ride-type preferences (accept Pool, accept Premium only, etc.)
10. Driver support / SOS

**Platform/Admin-facing**
1. Dynamic/surge pricing engine
2. Driver-rider matching engine
3. Fraud detection (fake GPS, fake trips, promo abuse)
4. Support ticketing, dispute resolution, refunds
5. Analytics dashboards (supply/demand heatmaps, city ops)
6. Driver incentive & payout management
7. Content moderation (chat, ratings, photos)
8. Geofencing (airport zones, restricted areas, service-area boundaries)

### 2.2 Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Availability** | 99.99% uptime; system must degrade gracefully, not fail hard |
| **Latency** | Matching < 3–5 sec; location ping ingestion < 200ms; fare estimate < 1 sec |
| **Scalability** | Support 100M+ registered users, 5M+ concurrent drivers broadcasting location every 3–4 sec |
| **Consistency** | Strong consistency for trip state & payments (no double-booking a driver); eventual consistency acceptable for ratings, analytics |
| **Durability** | No data loss on trip/payment records; replicated storage |
| **Fault Tolerance** | No single point of failure; regional failover |
| **Security** | Encrypted data at rest/in transit, PII protection, PCI-DSS for payments, OAuth2/JWT auth |
| **Geo-distribution** | Multi-region deployment, city-based data locality (traffic in Mumbai shouldn't touch a Chicago shard) |
| **Real-time** | Live GPS updates, push notifications delivered in near real-time |
| **Extensibility** | Pluggable pricing/matching algorithms, new ride types easily added |
| **Observability** | Full tracing/logging/metrics per trip lifecycle event |
| **Idempotency** | Retried requests (payment, ride-request) must not cause duplicate side-effects |

---

## 3. Back-of-Envelope Estimation

- Registered users: 100M riders, 5M drivers
- Daily Active: 20M riders, 2M drivers
- Peak concurrent online drivers: ~1M, sending location every 4 sec → **250K location writes/sec** at peak
- Ride requests: 20M rides/day → ~230 requests/sec average, **5–10x at peak (rush hour)** → ~2,000–2,500 req/sec
- Each trip generates: 1 trip record, ~5–10 location breadcrumbs/sec during trip (~15 min avg trip → ~600 points), 1 payment record, 2 ratings
- Storage: trip metadata small (~2KB), location breadcrumbs are the bulk → consider TTL / downsampling / cold storage after trip ends
- Read-heavy: map tile requests, ETA queries, driver location polling by rider app — cache-heavy workload

---

## 4. High-Level Architecture

```
                         ┌─────────────────────┐
                         │   Mobile Apps        │
                         │ (Rider App / Driver  │
                         │  App - iOS/Android)  │
                         └──────────┬───────────┘
                                    │ HTTPS / WebSocket / gRPC
                         ┌──────────▼───────────┐
                         │   API Gateway / LB     │  (rate limiting, auth, routing)
                         └──────────┬───────────┘
        ┌────────────┬─────────────┼─────────────┬──────────────┬─────────────┐
        ▼            ▼             ▼              ▼              ▼             ▼
   ┌─────────┐  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌───────────┐ ┌───────────┐
   │  User    │  │ Location │ │ Matching  │ │   Trip     │ │  Pricing  │ │  Payment  │
   │  Service │  │ Service  │ │ Service   │ │  Service   │ │  Service  │ │  Service  │
   └────┬─────┘  └────┬─────┘ └─────┬─────┘ └──────┬─────┘ └─────┬─────┘ └─────┬─────┘
        │             │              │              │              │             │
        │        ┌────▼─────┐        │              │              │             │
        │        │ Geo Index│        │              │              │             │
        │        │(QuadTree/│◄───────┘              │              │             │
        │        │ Geohash  │                        │              │             │
        │        │ + Redis) │                        │              │             │
        │        └──────────┘                        │              │             │
        │                                              │              │             │
        └───────────────┬──────────────────────────────┴──────────────┴─────────────┘
                         ▼
              ┌──────────────────────┐
              │   Kafka / Message Bus │  (event backbone: LocationUpdated,
              │                        │   RideRequested, TripStarted, etc.)
              └──────────┬────────────┘
        ┌────────────────┼─────────────────┬──────────────────┐
        ▼                ▼                 ▼                  ▼
  ┌───────────┐   ┌─────────────┐   ┌─────────────┐    ┌─────────────┐
  │Notification│   │  Analytics  │   │   Fraud     │    │  Rating &   │
  │  Service   │   │  / Stream   │   │  Detection  │    │  Review Svc │
  │ (Push/SMS) │   │  Processing │   │             │    │             │
  └───────────┘   └─────────────┘   └─────────────┘    └─────────────┘

  Supporting stores: PostgreSQL (users/trips - transactional), Cassandra (location
  history, high write throughput), Redis (live driver locations, session, cache),
  Elasticsearch (search/support tools), S3 (documents, receipts, map tiles cache)
```

Each box is an independently deployable microservice with its own DB (database-per-service pattern), communicating synchronously via gRPC for request/response flows and asynchronously via Kafka for events.

---

## 5. Core Services — Detailed Low-Level Design

### 5.1 User Service
Handles rider/driver profile, auth, and documents.

**Responsibilities:** registration, login/OTP, profile CRUD, driver document verification workflow, KYC status.

**Data model (PostgreSQL):**
```
users(id PK, phone, email, password_hash, role[rider|driver], name,
      created_at, status[active|suspended|banned])

driver_profile(user_id FK, license_no, vehicle_id FK, kyc_status,
                background_check_status, rating_avg, total_trips)

vehicle(id PK, driver_id FK, make, model, plate_no, category[economy|xl|premium], year)

rider_profile(user_id FK, rating_avg, home_address, work_address, payment_default_id)
```
Sharded by `user_id` hash. Auth uses JWT access tokens (short TTL) + refresh tokens; OTP via SMS gateway with rate-limiting to prevent abuse.

---

### 5.2 Location Service (the heart of real-time tracking)

**Responsibilities:** ingest continuous GPS pings from driver apps, maintain "who is near where" index, serve nearby-driver queries to the Matching Service, stream driver location to the rider during an active trip.

**Ingestion path:**
- Driver app sends location every 3–4 seconds via a lightweight protocol (gRPC bi-di stream or MQTT over persistent connection — MQTT preferred at this scale because of low overhead and pub/sub fit for millions of thin clients).
- A **Location Gateway** fleet terminates these connections, batches updates, publishes to Kafka topic `driver-location-updates` partitioned by `geohash-prefix` (so consumers can shard by geography).
- A **Location Consumer** updates:
  1. **Redis Geo (GEOADD)** — hot in-memory index of current driver lat/lng per city cluster (Redis instance sharded by city/region), TTL-based eviction if a driver stops pinging (goes stale → considered offline).
  2. **Cassandra** — append-only historical breadcrumb log (`driver_id, timestamp, lat, lng`), partitioned by `driver_id + day`, used for trip replay, fraud analysis, ETA model training. Not on the hot path for matching.

**Why not just SQL:** GPS writes are enormous volume, append-mostly, and time-ordered — a perfect fit for a wide-column store like Cassandra (or DynamoDB), while nearest-neighbor queries need Redis GEO / an in-memory spatial index because DB range-scans are too slow at this QPS.

**Geospatial indexing options (pick one, all are valid; trade-offs below):**
| Approach | How it works | Pros | Cons |
|---|---|---|---|
| **Geohash** | Encode lat/lng into a base32 string; nearby points share string prefixes | Simple, works natively with Redis (`GEOADD`/`GEORADIUS`), easy to shard by prefix | Edge cases at boundary cells (need to check 8 neighboring cells) |
| **QuadTree** | Recursively divide map into 4 quadrants until each leaf has ≤N drivers | Naturally adapts density (dense cities get finer cells) | More complex to maintain/rebalance in a distributed setting |
| **Google S2 / H3 (hex grid)** | Hierarchical cell IDs covering the sphere | Very accurate, used by Uber's real H3 library, good for hexagon-based surge zones | Steeper learning curve |

**Recommended:** Redis GEO (geohash-based) for the *live* index because of O(log n) radius queries out of the box, combined with **Uber's H3** hex-grid for *surge pricing zones and supply/demand aggregation* (hexagons tile better than geohash squares for area-based stats).

---

### 5.3 Matching Service (Dispatch Engine)

**Responsibilities:** given a ride request, find the best driver and offer the ride.

**Flow:**
1. Rider requests ride → Trip Service creates trip in `REQUESTED` state → publishes `RideRequested` event with pickup geo + ride type.
2. Matching Service consumes event, queries Location Service for drivers within an expanding radius (start 1km → 3km → 5km if no acceptance) who are: online, idle (not on another trip), correct vehicle category, KYC-valid.
3. Rank candidates by a scoring function, e.g.:
   `score = w1*(1/ETA_to_pickup) + w2*driver_rating + w3*(1 - recent_cancel_rate) + w4*idle_time_bonus`
   (idle_time_bonus rewards drivers who've been waiting longest — fairness).
4. Send ride offer to the top driver via push notification / persistent socket, start a **10–15 second acceptance timer**.
5. If accepted → lock driver (mark `on_trip` in Redis with a distributed lock / optimistic version check to avoid double-assignment race), transition trip to `MATCHED`, notify rider.
6. If rejected or timeout → offer to next candidate (or **batch-dispatch**: offer to top 3 simultaneously, first accept wins — reduces latency, common in real systems, but requires atomic "claim" to prevent double accept).

**Concurrency control:** Use Redis `SETNX`/Lua script or a compare-and-swap on the driver's status row to atomically claim a driver — this is the classic "prevent two riders getting the same driver" race condition, solved with a distributed lock or single-writer partition (all matching for a given driver_id routed to one partition/consumer).

**Batching for efficiency:** Instead of matching one request at a time, some systems run a **windowed batch matching** (collect requests for ~2 sec in a dense area, run a bipartite matching / Hungarian-algorithm-like optimization to minimize total wait time across many rider-driver pairs simultaneously) — better global efficiency than greedy nearest-driver, used for pool rides especially.

---

### 5.4 Trip Service (source of truth for ride state)

**State machine:**
```
REQUESTED → MATCHED → DRIVER_ARRIVING → DRIVER_ARRIVED → IN_PROGRESS → COMPLETED
                 │                                              │
                 └──────────────► CANCELLED ◄───────────────────┘
```
**Data model (PostgreSQL, strongly consistent — this is transactional core data):**
```
trips(id PK, rider_id, driver_id, status, ride_type,
      pickup_lat, pickup_lng, drop_lat, drop_lng,
      requested_at, matched_at, started_at, completed_at,
      fare_estimate, fare_final, distance_km, duration_sec,
      cancel_reason, cancelled_by)

trip_events(id PK, trip_id FK, event_type, timestamp, metadata JSON)  -- audit trail
```
Every state transition is an event sourced into `trip_events` (append-only) for auditability/dispute resolution, while `trips` holds the current materialized state (CQRS-style: write events, project current state).

Trip Service owns the state machine and enforces valid transitions (e.g., can't go IN_PROGRESS without MATCHED first) — validated server-side so a malicious client can't skip steps.

**Pickup verification:** 4-digit OTP or QR code shown to rider, driver enters it to start trip — prevents wrong-rider pickup and GPS spoofing scams.

---

### 5.5 Pricing Service

**Base fare calculation:** `base_fare + (distance_km * per_km_rate) + (duration_min * per_min_rate) + booking_fee`, computed via routing engine's distance/ETA (see 5.7).

**Surge pricing:** compute a demand/supply ratio per H3 hexagon cell in near-real-time:
- Consume `RideRequested` and driver-location events, maintain a sliding-window count of (open requests) vs (available idle drivers) per hex cell in Redis.
- `surge_multiplier = f(demand/supply ratio)`, clamped (e.g., 1.0x–3.0x), smoothed to avoid flickering (drivers/riders shouldn't see surge jump every second — update every 60–90 sec, with hysteresis).
- Multiplier applied at request time and **locked in as the fare estimate shown to the rider before confirming** (so it can't change mid-negotiation), re-validated at trip completion against actual distance/time.

**Non-functional note:** this must be a fast read-path lookup (Redis) — cannot hit a heavy compute pipeline synchronously while a rider is waiting for a quote.

---

### 5.6 Payment Service

**Responsibilities:** tokenized card storage (PCI-DSS scope minimized by delegating raw card storage to a certified processor like Stripe/Braintree — platform stores only tokens), fare capture, driver payouts, wallet, refunds.

**Flow:** at trip completion, Trip Service publishes `TripCompleted` → Payment Service computes final fare (distance/time from actual GPS trace, not estimate) → charges rider's default payment method (idempotency key = trip_id to prevent double charge on retry) → splits: platform commission vs driver payout → credits driver's earnings ledger (deferred payout batch, e.g., weekly) → emits receipt event to Notification Service.

**Data model:**
```
payments(id PK, trip_id FK UNIQUE, rider_id, amount, currency,
         status[pending|captured|failed|refunded], idempotency_key, processor_ref)

driver_ledger(id PK, driver_id, trip_id, amount, type[fare|bonus|adjustment], payout_batch_id)
```
Idempotency key + unique constraint on `trip_id` in `payments` guarantees exactly-once charging even under retries/network failures.

---

### 5.7 Routing / ETA / Maps Service

Not built from scratch — wraps a routing engine (OSRM, Valhalla, or Google Maps/Mapbox APIs) that computes shortest/fastest path on a road-graph, gives:
- Distance & duration for fare estimation
- Turn-by-turn navigation for driver app
- ETA for "driver arriving in X min"

Internally caches frequent route segments (e.g., airport-to-downtown) since these are queried heavily. ML model can correct raw routing-engine ETAs using historical actual-trip-time data (traffic patterns, time-of-day) — this correction layer is often what companies like Uber build in-house on top of a base routing engine.

---

### 5.8 Notification Service
Consumes events from Kafka (`RideMatched`, `DriverArrived`, `TripCompleted`, `PromoAvailable`, etc.) and fans out to APNs/FCM (push), Twilio (SMS), and in-app WebSocket channel. Must be at-least-once delivery with dedup on client side (notification id).

### 5.9 Rating & Review Service
Simple CRUD service; ratings stored async (eventual consistency fine here), aggregated rolling average recomputed periodically or via streaming aggregation, feeds back into Matching Service's scoring and into Trust & Safety (auto-flag drivers below threshold rating).

### 5.10 Fraud & Trust Safety Service
Consumes location + trip + payment events, runs rule-based and ML anomaly detection: GPS teleportation (impossible speed between pings), trip distance/fare mismatch, promo code abuse patterns, fake account rings (device fingerprinting, shared device/payment across many accounts).

---

## 6. Key End-to-End Flows

### 6.1 Requesting a ride
1. Rider app → API Gateway → Trip Service: `POST /trips` (pickup, drop, ride_type)
2. Trip Service → Pricing Service: get fare estimate (sync gRPC call)
3. Trip Service creates trip row (`REQUESTED`), returns estimate to rider, publishes `RideRequested`
4. Matching Service picks up event, queries Location Service (Redis GEO) for candidates
5. Offer sent to driver via push/socket; driver accepts within timer
6. Matching Service atomically claims driver, calls Trip Service to transition to `MATCHED`
7. Trip Service publishes `RideMatched` → Notification Service pushes driver info to rider
8. Driver's live location streamed to rider via WebSocket subscription keyed by `trip_id` (Location Service publishes filtered updates only for drivers currently in an active trip to reduce fan-out cost)

### 6.2 Trip execution
1. Driver arrives → app calls `PATCH /trips/{id}` status=`DRIVER_ARRIVED` → notifies rider
2. Rider gives OTP → driver enters it → Trip Service validates → status=`IN_PROGRESS`, `started_at` set
3. Location breadcrumbs continuously logged against `trip_id` for the duration
4. Driver ends trip → status=`COMPLETED`, `completed_at` set, final distance/duration computed from breadcrumb trace
5. `TripCompleted` event → Payment Service charges rider, pays driver, generates receipt → Rating prompts shown to both parties

### 6.3 Cancellation
Either party can cancel before `IN_PROGRESS`. Trip Service validates allowed transition, applies cancellation-fee policy service (e.g., free within 2 min of matching, fee after), releases driver back to `idle` pool in Location/Matching state, notifies the other party.

---

## 7. Data Storage Strategy Summary

| Data | Store | Why |
|---|---|---|
| User/driver profiles, trips, payments | PostgreSQL (sharded) | Strong consistency, relational integrity, transactions |
| Live driver locations | Redis (GEO commands) | In-memory, sub-ms nearest-neighbor queries |
| Location history / breadcrumbs | Cassandra / DynamoDB | High write throughput, time-series, horizontally scalable |
| Session/cache/rate-limits | Redis | Fast key-value, TTL support |
| Search (support tools, admin) | Elasticsearch | Full-text & filtered search over trips/tickets |
| Documents, receipts, images | S3 / Blob storage + CDN | Cheap durable object storage |
| Event backbone | Kafka | Durable, replayable, decouples producers/consumers, high throughput |
| Analytics / ML feature store | Data lake (S3 + Spark/Flink) + Warehouse (BigQuery/Redshift) | Batch + stream analytics, surge/ETA model training |

**Sharding strategy:** shard primarily by **city/region** (natural partition since rides don't cross cities in a single trip in the vast majority of cases) and secondarily by `user_id` hash within a region for user data. This also aligns with data residency/regulatory requirements.

---

## 8. Scalability & Reliability Details

- **API Gateway / Load Balancing:** L7 load balancer (e.g., Envoy) in front of stateless service replicas; consistent hashing for WebSocket/MQTT connections so a driver's persistent connection sticks to a gateway node that shares the Redis shard for their region.
- **Horizontal scaling:** every service is stateless and independently scaled; state lives in Redis/PostgreSQL/Cassandra, not in-process.
- **Database scaling:** read replicas for PostgreSQL (read-heavy queries like trip history), connection pooling (PgBouncer), partitioning trips table by month for archival.
- **Caching:** CDN for map tiles/static assets; Redis cache-aside for driver profiles, fare-rules, frequently-read reference data.
- **Backpressure:** Kafka absorbs bursts (e.g., a stadium event ending → sudden ride-request spike) so downstream services aren't overwhelmed; consumers scale out based on partition lag.
- **Circuit breakers & bulkheads:** e.g., if Payment Service is degraded, Trip Service still completes the trip and queues payment capture for retry rather than blocking the whole flow.
- **Multi-region / disaster recovery:** active-active across regions where regulation allows, with regional data sovereignty; async cross-region replication for global aggregates (analytics) only, never for the hot transactional path.
- **Graceful degradation:** if surge computation service is down, fall back to base fare (safe default) rather than blocking ride requests; if ETA/routing engine is slow, fall back to straight-line-distance estimate.
- **Rate limiting:** per-user and per-IP on API Gateway to prevent abuse (fake ride request floods, scraping).

---

## 9. Security

- TLS everywhere (client↔gateway, service↔service via mTLS)
- OAuth2/JWT short-lived access tokens + refresh token rotation
- PII encryption at rest (AES-256), field-level encryption for sensitive data (payment tokens, government ID)
- PCI-DSS compliance delegated to certified payment processor; platform never stores raw card numbers
- Role-based access control for internal admin tools
- Driver background-check integration (third-party verification API) gating account activation
- Device fingerprinting + anomaly detection to blunt fake-account/promo-abuse rings
- Audit log (immutable) for all trip and payment state changes for dispute resolution and regulatory compliance

---

## 10. Observability

- **Metrics:** per-service RED metrics (Rate, Errors, Duration), business metrics (matches/sec, avg time-to-match, cancellation rate, surge distribution) via Prometheus/Grafana
- **Distributed tracing:** OpenTelemetry trace spanning gateway → matching → trip → payment for a single ride, to debug latency spikes
- **Logging:** structured logs centralized (ELK/Loki), correlated by `trip_id` and `request_id`
- **Alerting:** on-call paging for match-time SLO breaches, payment failure spikes, region-level outage detection
- **Real-time dashboards:** supply/demand heatmap by city, live driver/rider counts, surge zone visualization for ops teams

---

## 11. Key Design Trade-offs (interview talking points)

1. **Greedy nearest-driver vs batch matching** — greedy is simpler and lower latency per request; batch matching (windowed, optimization-based) yields better system-wide efficiency (lower total wait time) but adds a few seconds of intentional delay — real systems use greedy for premium/immediate rides and batching for Pool.
2. **Strong vs eventual consistency** — trip state and payment must be strongly consistent (no double booking, no double charge); location pings and ratings can be eventually consistent for throughput.
3. **Push vs pull for driver location to rider app** — push (WebSocket/SSE) preferred for low latency but costs more persistent connections; pull/polling is simpler but adds latency and server load at scale — hybrid: push during active trip, pull for general "drivers near me" map view.
4. **Geohash vs QuadTree vs H3** — geohash is simplest and Redis-native; H3 hexagons are better for surge-zone aggregation because hexagons have uniform adjacency (no corner-distance distortion like squares).
5. **Monolith vs microservices** — microservices chosen for independent scaling (location writes scale very differently from payment writes) and independent deployability, at the cost of operational complexity (service mesh, distributed tracing needed).

---

## 12. Summary Checklist

- [x] Functional requirements (rider, driver, admin)
- [x] Non-functional requirements table
- [x] Capacity estimation
- [x] High-level architecture diagram
- [x] Low-level service breakdown with data models
- [x] Geospatial indexing strategy
- [x] Matching/dispatch algorithm
- [x] Pricing & surge algorithm
- [x] Payment idempotency & consistency
- [x] End-to-end request/trip/cancellation flows
- [x] Storage technology choices with rationale
- [x] Scalability, caching, fault tolerance
- [x] Security & compliance
- [x] Observability
- [x] Trade-off discussion
