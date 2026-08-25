# RideShare Platform — Backend API

Industrial-grade rideshare backend. Node.js · Fastify · Drizzle ORM · PostgreSQL · Kafka · Redis · Socket.IO

---

## Quick Start

```bash
cp .env.example .env          # fill in your keys
docker compose up -d          # postgres, redis, kafka, kafka-ui
npm install
npm run kafka:topics          # create all Kafka topics
npm run db:generate           # generate migrations
npm run db:migrate            # run migrations
npm run dev                   # start with hot-reload
```

Swagger UI → http://localhost:3000/docs
Kafka UI   → http://localhost:8080

---

## API Response Format

**Single object / action:**
```json
{ "SUCCESS": true, "MESSAGE": { ... } }
```

**List with pagination:**
```json
{
  "SUCCESS": true,
  "MESSAGE": [ ... ],
  "COUNT": 20,
  "PAGINATION": {
    "currentPage": 1,
    "itemsPerPage": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}
```

**Error:**
```json
{ "SUCCESS": false, "MESSAGE": "Reason here" }
```

---

## Route Map

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/v1/auth/rider/send-otp` | Public | Send OTP to rider phone |
| POST | `/api/v1/auth/rider/verify-otp` | Public | Verify OTP → get JWT |
| POST | `/api/v1/auth/driver/send-otp` | Public | Send OTP to driver phone |
| POST | `/api/v1/auth/driver/verify-otp` | Public | Verify OTP → get JWT |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| POST | `/api/v1/auth/logout` | Any JWT | Logout |
| POST | `/api/v1/auth/admin/login` | Public | Admin email+password login |
| GET | `/api/v1/riders/profile` | Rider | Get rider profile |
| PATCH | `/api/v1/riders/profile` | Rider | Update profile |
| GET | `/api/v1/riders/rides` | Rider | Ride history (paginated) |
| GET | `/api/v1/drivers/profile` | Driver | Get driver profile |
| PATCH | `/api/v1/drivers/profile` | Driver | Update profile |
| POST | `/api/v1/drivers/documents` | Driver | Submit docs for approval |
| POST | `/api/v1/drivers/go-online` | Driver | Go online with lat/lng |
| POST | `/api/v1/drivers/go-offline` | Driver | Go offline |
| POST | `/api/v1/drivers/location` | Driver | Update GPS location |
| GET | `/api/v1/drivers` | Admin | List all drivers (filtered) |
| POST | `/api/v1/drivers/:id/approve` | Admin | Approve driver |
| POST | `/api/v1/drivers/:id/reject` | Admin | Reject driver |
| POST | `/api/v1/drivers/:id/block` | Admin | Block driver |
| GET | `/api/v1/vehicle-types` | Public | List active vehicle types |
| POST | `/api/v1/vehicle-types` | Admin | Create vehicle type |
| PATCH | `/api/v1/vehicle-types/:id` | Admin | Update vehicle type |
| PATCH | `/api/v1/vehicle-types/:id/enable` \| `/disable` | Admin | Enable/disable vehicle type |
| GET | `/api/v1/zones` | Public | List zones |
| POST | `/api/v1/zones` | Admin | Create zone |
| POST | `/api/v1/zones/detect` | Public | Detect zone by lat/lng |
| POST | `/api/v1/fare/estimate` | Public | Estimate fare for one vehicle type |
| POST | `/api/v1/fare/estimate-all` | Public | Estimate fare for all vehicle types |
| GET | `/api/v1/fare/rules` | Admin | List fare rules |
| POST | `/api/v1/fare/rules` | Admin | Create fare rule |
| PATCH | `/api/v1/fare/rules/:id` | Admin | Update fare rule |
| PATCH | `/api/v1/fare/rules/:id/enable` \| `/disable` | Admin | Enable/disable fare rule |
| POST | `/api/v1/rides` | Rider | Request a ride |
| GET | `/api/v1/rides/:id/track` | Rider | Track ride + driver location |
| POST | `/api/v1/rides/:id/cancel` | Rider | Cancel ride |
| POST | `/api/v1/rides/:id/rate` | Rider | Rate driver (1-5) |
| POST | `/api/v1/rides/:id/accept` | Driver | Accept a ride |
| POST | `/api/v1/rides/:id/arriving` | Driver | Mark as arriving at pickup |
| POST | `/api/v1/rides/:id/start` | Driver | Start ride |
| POST | `/api/v1/rides/:id/complete` | Driver | Complete ride |
| POST | `/api/v1/rides/:id/driver-cancel` | Driver | Driver cancels (re-matches) |
| GET | `/api/v1/rides/driver/active` | Driver | Get current active ride |
| GET | `/api/v1/rides` | Admin | List all rides (filtered) |
| GET | `/api/v1/subscriptions/plans` | Public | List active plans |
| POST | `/api/v1/subscriptions/initiate` | Driver | Start subscription payment |
| POST | `/api/v1/subscriptions/verify` | Driver | Verify payment → activate |
| GET | `/api/v1/subscriptions/mine` | Driver | My active subscription |
| GET | `/api/v1/subscriptions/history` | Driver | Subscription history |
| POST | `/api/v1/subscriptions/webhook/razorpay` | Public | Razorpay webhook |
| GET | `/api/v1/subscriptions/plans/all` | Admin | All plans (paginated) |
| POST | `/api/v1/subscriptions/plans` | Admin | Create plan (any type) |
| PATCH | `/api/v1/subscriptions/plans/:id` | Admin | Update plan |
| GET | `/api/v1/admin/dashboard` | Admin | Platform stats |
| GET | `/api/v1/admin/stats/rides` | Admin | Ride stats by day |
| GET | `/api/v1/admin/stats/subscriptions` | Admin | Subscription breakdown |
| GET | `/api/v1/admin/audit-logs` | Admin | Audit log (paginated) |
| GET | `/api/v1/flagged-trips` | Admin | List trips flagged for fare-deviation review |
| GET | `/api/v1/flagged-trips/:id` | Admin | Get one flagged trip |
| PATCH | `/api/v1/flagged-trips/:id/approve` | Admin | Bill the GPS-recomputed actual fare |
| PATCH | `/api/v1/flagged-trips/:id/adjust` | Admin | Bill a manually-set amount instead |
| GET | `/metrics` | Public (internal) | Prometheus metrics |

---

## Driver Matching — Expanding Radius, H3 Index, Distributed Locking

When a ride is requested the matching engine searches for drivers in three rings:

```
Ring 1 → 5 km   — wait 25s
Ring 2 → 10 km  — wait 25s  (only drivers NOT already offered in ring 1)
Ring 3 → 15 km  — wait 25s  (only drivers NOT already offered in rings 1-2)
No driver found → ride status = 'expired', rider notified
```

**Candidate lookup is H3-indexed, not a full-table scan.** Driver availability
is tracked in a Redis reverse index by H3 cell (resolution 6, ~3.72km edge —
`src/modules/matching/driver-geo-index.service.js`, mirroring the same pattern
`src/modules/zone/hex-zone.service.js` uses for zones). Each ring computes a
`gridDisk` around the pickup point sized for its radius, unions the indexed
driver IDs, and only then does one bounded Postgres query for eligibility
filters + exact distance — this stays index-based as the driver table grows.

**Scoring** uses real ETA (one batched Google Distance Matrix call per ring,
not per candidate — `getEtaMatrix()` in `src/utils/maps.js`), rating, and
acceptance rate (derived from `ride_offers` history), with admin-configurable
weights (`matching_weights` table, defaults `0.5 / 0.3 / 0.2`):
```
score = distanceWeight × (1/etaMin) + ratingWeight × (rating/5) + acceptanceRateWeight × acceptanceRate
```
Any driver hard-blocked against the requesting rider (`driver_rider_blocks`
table) is excluded outright, not just downranked.

**Distributed locking**: before being added to a ring's offer set, each
candidate must acquire a Redis `SET NX PX` lock
(`src/modules/matching/driver-lock.service.js`) — this prevents the same
driver being offered two concurrent rides at once. A candidate that loses the
lock race is simply skipped; the next-ranked candidate in the same pool
backfills the slot. Locks are released precisely when `ride_offers` rows
actually resolve (accepted/superseded, or expired at ring timeout) — never
"every candidate in the ring," which could race a late accept.

Top 5 per ring are broadcast via Kafka → Socket.IO to each driver's room.

---

## Fare Calculation & Rate Cards

`calculateFare()` (`src/modules/fare/fare.service.js`) resolves country →
rate card → real routing distance/time (Google Maps, logged Haversine
fallback if unconfigured) → zone/surge rules → tax, and stamps exactly which
rate-card row and fare rules were used onto the ride (`ratePricingId`,
`appliedFareRuleIds`) alongside the existing `fareSnapshot` breakdown.

**Rate-card resolution precedence** (`resolveRateCard()` in
`src/modules/vehicle-type/vehicle-type-pricing.service.js`):
1. **Exact** — vehicleType + country + fuelType, active at the given date.
2. **Category** — vehicleType + country, `fuelType IS NULL`.
3. **Global default** — the deployment's default country, same vehicleType.

Rate cards are **versioned, never mutated in place** — `upsertRate()` marks
the current row `effectiveTo=now`/`isActive=false` and inserts a new row at
`version+1`, so a disputed historical trip can be recalculated with the rate
card that was actually active at its request time (pass that ride's
`requestedAt` as `resolveRateCard()`'s `atDate`), not whatever the card has
since been changed to.

**Fuel-type tier is schema-ready but not yet reachable**: `calculateFare()`
always resolves with `fuelType = null`, since the specific vehicle isn't known
until *after* driver matching. The column and exact-match tier exist for a
future rider-facing "choose EV/fuel type" feature.

**Adding a new city/vehicle category/rate card**: create the country/city via
the existing `geo` admin endpoints, create a `vehicle_types` row for a new
category, then `upsertRate(vehicleTypeId, countryId, {...})` to price it in
each country — omit `fuelType` for the only tier reachable today. Re-running
`upsertRate()` on an existing pair versions automatically; it never overwrites.

Zone/surge precedence (`fare_rules` priority ordering, polygon + H3 hex-zone
matching) is unchanged from before this pass — see `fare.service.js`'s inline
comments.

---

## GPS Reconciliation — Estimate vs. Actual

During a trip, `location_update` pings are buffered in Redis (not written to
Postgres per-ping) and batch-flushed by a BullMQ worker every 60s plus once
more at trip completion (`src/modules/trip-gps/`). Each ping is classified as
noise (accuracy > 50m or implied speed > 180 km/h vs. the previous valid ping)
or following a gap (≥90s since the previous valid ping) before being persisted
to `trip_gps_pings`.

At completion, `finalizeTripDistance()` computes the actual distance from
non-noise pings (projected onto the *planned* route polyline, monotonic —
this is polyline-projection, not true snap-to-road) and recomputes the fare
using the **rate-card version and zone/surge multipliers stamped on the ride
at request time**, not current live rates. **Policy**: if the recomputed
actual fare exceeds the estimate by more than **20%**, it is *not* auto-billed
— the trip lands in `flagged_trips` (`pending_review`) for manual approval or
adjustment via `/api/v1/flagged-trips`, and `finalFareMinor` stays at the
original estimate until reviewed. Within tolerance, the accurate recomputed
fare is billed directly (including when it's *lower* than the estimate — only
an overcharge risk gets flagged).

---

## Observability

`GET /metrics` (Prometheus, `prom-client`) exposes matching ring duration by
outcome, lock acquire success/contention counts, routing-fallback counts,
GPS ping classification counts, fare-deviation-flagged count, and rate-card
resolution counts by tier (a rising `global` share flags a market missing a
real rate card).

---

## Launch decisions — confirm/tune before production

- **Routing cost at scale**: Google Maps is wired for both fare quotes and
  matching ETA (batched to 1 call/ring). Cost scales with ride volume;
  self-hosted OSRM/Valhalla is the standard cost-reduction path if/when that
  matters — not done in this pass.
- **True map-matching is not implemented** — GPS reconciliation projects onto
  the planned route, it doesn't snap-to-road. Google Roads API or a
  self-hosted OSRM/Valhalla `match` service is the real fix, deferred as an
  explicit cost/ops decision.
- **Mobile client coordination needed**: `location_update` now accepts
  optional `accuracy`, `speedKmh`, `recordedAt` — without them, GPS noise/gap
  classification degrades (accuracy-based rejection won't trigger).
- **Fuel-type-tiered pricing** is schema-ready, not reachable until a
  rider-facing fuel/EV selection feature exists.
- **Tunable defaults** not yet backed by real traffic data: lock TTL (25s+5s),
  H3 driver-index resolution (6), GPS noise thresholds (50m / 180 km/h / 90s
  gap), fare-deviation flag threshold (20%).
- **Rate-card `effectiveFrom` backfill**: existing rows were backfilled to the
  migration's run timestamp, not their true original effective date —
  historical recalculation for a ride requested *before* this migration will
  fall through to the category/global tier instead of finding that exact card.
- **Flagged-trips review is backend-only** — no portal UI yet.
- **Test coverage is pure-function unit tests only** (`test/*.test.js`) — no
  Postgres/Redis test-container harness exists, so the lock race condition
  and full end-to-end flow are verified manually: request a ride, accept it,
  drive a simulated GPS trace through `location_update` (include a couple of
  noisy/high-speed points and one gap), complete it, and confirm
  `flagged_trips` only populates when the trace deviates >20% from the
  estimate. For the lock race: fire two concurrent `requestRide` calls whose
  candidate pools overlap on one online driver and confirm only one ride's
  ring ends up offering that driver.

---

## Socket.IO Events

**Driver namespace** (`/driver`)

| Emit (client→server) | Payload | Description |
|----------------------|---------|-------------|
| `go_online` | `{ lat, lng }` | Mark online, start receiving rides |
| `go_offline` | — | Mark offline |
| `location_update` | `{ lat, lng, accuracy?, speedKmh?, recordedAt? }` | Live GPS update (every ~4s). The optional fields feed GPS noise/gap classification for trip billing reconciliation — see GPS Reconciliation section. |
| `ride:accept` | `{ rideId }` | Accept a ride |

| On (server→client) | Payload | Description |
|--------------------|---------|-------------|
| `ride:new_request` | ride details + expiry | New ride available |
| `ride:taken` | `{ rideId }` | Another driver accepted first |
| `status` | `{ isOnline }` | Status acknowledgment |

**Rider namespace** (`/rider`)

| Emit (client→server) | Payload | Description |
|----------------------|---------|-------------|
| `ride:subscribe` | `{ rideId }` | Subscribe to ride updates |
| `ride:unsubscribe` | `{ rideId }` | Unsubscribe |

| On (server→client) | Payload | Description |
|--------------------|---------|-------------|
| `ride:driver_assigned` | driver info | Driver accepted the ride |
| `driver:location` | `{ lat, lng }` | Live driver position |
| `ride:started` | `{ rideId }` | Ride started |
| `ride:completed` | `{ rideId, finalFare }` | Ride completed |
| `ride:cancelled` | `{ rideId }` | Ride cancelled/expired |

---

## Kafka Topics

| Topic | Producer | Consumer |
|-------|----------|----------|
| `ride.requested` | Ride service | Matching engine |
| `ride.matched` | Matching engine | Socket bridge → drivers |
| `ride.accepted` | Ride service | Socket bridge → rider |
| `ride.started` | Ride service | Socket bridge |
| `ride.completed` | Ride service | Socket bridge + analytics |
| `ride.cancelled` | Ride/Matching | Socket bridge |
| `driver.location` | Socket/Driver | Rider socket bridge |
| `driver.status_changed` | Driver service | Analytics |
| `fare.calculated` | Fare engine | Analytics |
| `payment.success` | Razorpay webhook | Subscription service |
| `notif.push` | Any service | Notification consumer → FCM |
| `subscription.activated` | Subscription svc | Notification |
| `subscription.expired` | BullMQ job | Notification |
| `audit.log` | Any service | Audit consumer → DB |
