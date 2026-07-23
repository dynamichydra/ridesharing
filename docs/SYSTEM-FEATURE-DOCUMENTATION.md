# RideShare Platform — Complete Feature & Functionality Documentation

This document is a full inventory of every feature and functionality across all three
projects in this repository — the **backend** (Node.js/Fastify API), the **admin portal**
(React), and the **rider mobile app** (Flutter) — plus the complete database schema.

It is generated from the actual current codebase (not from assumptions), covering every
module, route, service function, database table, and screen present at the time of writing.

## Companion diagrams (`docs/diagrams/`)

| File | Type | What it shows |
|---|---|---|
| [`database-er-diagram.mermaid`](diagrams/database-er-diagram.mermaid) | Entity-Relationship | All 37 database tables, every column with type, and every foreign-key relationship |
| [`system-architecture.mermaid`](diagrams/system-architecture.mermaid) | Flowchart | Clients → backend modules → infrastructure (Postgres/Redis/Kafka/BullMQ/Socket.IO) → external services |
| [`feature-map.mermaid`](diagrams/feature-map.mermaid) | Mindmap | Every feature across backend, portal, and mobile app in one visual tree |
| [`ride-lifecycle-sequence.mermaid`](diagrams/ride-lifecycle-sequence.mermaid) | Sequence | The core ride flow end-to-end: estimate → request → matching → accept → tracking → completion → GPS reconciliation → payment |

Render any `.mermaid` file with the Mermaid Live Editor, a VS Code Mermaid preview extension,
or any Markdown renderer that supports fenced ` ```mermaid ` blocks.

---

## 1. Business model in one paragraph

This is a **subscription-based** ride-sharing platform: drivers pay a recurring membership
fee (`subscription_plans` / `subscriptions`) instead of a per-ride commission, and can only
go online (`POST /drivers/go-online`) while `drivers.subscriptionStatus = 'active'`. Riders
can optionally hold their own membership (`rider_subscription_plans` / `rider_subscriptions`)
for perks. Every ride is priced by a per-country, per-vehicle-type, versioned rate card
(`vehicle_type_pricing`) modified by admin-configurable fare rules (time/traffic/zone/demand)
and taxes, matched to a nearby driver via an expanding-ring geo search, tracked live via GPS,
and settled either online (Razorpay/Stripe) or in cash — with GPS-derived actual-distance
reconciliation catching fare deviations for manual admin review.

---

## 2. Backend (`backend/`) — 22 modules

All routes are mounted under `/api/{API_VERSION}`. Swagger UI is at `/docs`, Prometheus
metrics at `/metrics`.

### 2.1 Auth (`modules/auth`) — `/auth`
- Rider: `POST /rider/send-otp`, `POST /rider/verify-otp` — phone OTP login (OTP is
  console-logged in dev, sent via Twilio in production).
- Driver: `POST /driver/mobile/start|resend|verify` — device-scoped OTP login (each device
  gets its own row in `driver_devices` and its own refresh-token session, so revoking one
  device doesn't log out others); `POST /driver/email/start|verify` — email-based signup;
  `POST /driver/send-otp|verify-otp` — legacy phone flow kept for compatibility.
  `GET /devices`, `DELETE /devices/:deviceId` — list/revoke a driver's logged-in devices.
- Admin: `POST /admin/login` — email/bcrypt-password login.
- Shared: `POST /refresh` (rotates JWT using the Redis-stored refresh token),
  `POST /logout` (any authenticated role).
- JWT access tokens signed with `JWT_SECRET`; refresh tokens signed separately with
  `JWT_REFRESH_SECRET` and stored in Redis under `REDIS_KEYS.refreshToken(userId, deviceId)`.

### 2.2 Driver (`modules/driver`) — `/drivers`
- Self-service: `GET/PATCH /profile`, `PUT /driving-location`, profile-photo presigned
  upload flow, `GET /registration-summary` (computes `isComplete` + a list of missing
  requirements across vehicles/documents/onboarding answers), `POST /submit-application`,
  `POST /go-online` (blocked unless approved + subscription active + not blocked),
  `POST /go-offline`, `POST /location`, `PATCH /fcm-token`.
- Admin: `GET /` (filterable list), `GET /:id` (full detail), `POST /:id/approve`,
  `POST /:id/reject`, `POST /:id/request-documents`, `POST /:id/block`, `POST /:id/unblock`.
- Publishes: `DRIVER_REGISTRATION_SUBMITTED`, `DRIVER_STATUS_CHANGED`, `DRIVER_LOCATION`,
  push notifications for approval/rejection/document-request, and audit-log events.

### 2.3 Rider (`modules/rider`) — `/riders`
- Self-service: `GET/PATCH /profile`, `GET /rides`, `PATCH /fcm-token`.
- Admin: `GET /` (list + search), `POST /` (create), `GET /:id` (detail with aggregated ride
  stats), `GET /:id/rides`, `PATCH /:id`.

### 2.4 Onboarding (`modules/onboarding`) — `/onboarding`
The **driver registration/onboarding system**: a fully admin-configurable, conditional
questionnaire plus versioned legal documents plus multi-language content.
- Driver-facing: `GET /config` (one-shot bundle: countries + localized questionnaire +
  document requirements + vehicle types + terms/privacy), `GET /state`, `GET /questions`,
  `POST /answers`, `GET /answers/mine`, `GET /legal/:type`, `POST /legal/accept`.
- Admin: questions CRUD + drag-reorder (`/admin/questions`, `PATCH .../reorder`), options
  CRUD (`/admin/questions/:id/options`), translations (`PUT /admin/translations/:entityType/:entityId`),
  legal document publishing (`/admin/legal` — versioned, publishing supersedes the prior
  active version, no update-in-place).
- Conditional visibility engine (`condition.js`): questions can depend on another question's
  answer via `equals/not_equals/in/gt/lt` operators, resolved per-driver at render time.
- See `backend/docs/driver-registration-design.md` for the full design rationale.

### 2.5 Documents (`modules/documents`) — `/documents`
Driver KYC document upload and admin verification.
- Driver: `GET /types`, `GET /mine`, `POST /:documentTypeId/upload-url` (presigned S3 PUT),
  `POST /:documentTypeId` (confirm — verifies the object was actually uploaded and isn't
  expired, then advances the registration state machine).
- Admin: document-type catalog CRUD, per-country/city/vehicle-type requirement scoping
  (`document_type_requirements`), `GET /admin/drivers/:driverId` (view all of a driver's
  docs with signed view URLs), `POST /admin/:docId/verify` (approve/reject).

### 2.6 Vehicle (`modules/vehicle`) — `/vehicles`
A driver's registered vehicle(s). `GET /mine`, `POST /` (add — deactivates any prior vehicle,
enforcing a single-active-vehicle policy and advancing registration), `PATCH /:id`,
`DELETE /:id` (soft delete). Every write mirrors the active vehicle's type/number/model/year
back onto the `drivers` table for backward compatibility with older reads.

### 2.7 Vehicle Type (`modules/vehicle-type`) — `/vehicle-types`
Global vehicle-category catalog (Bike/Auto/Cab) plus **per-country, versioned rate cards**.
- Public: `GET /`, `GET /:id`, `GET /:id/pricing?countryId=`.
- Admin: CRUD + enable/disable, `PUT /:id/pricing` (upsert — never mutates in place; marks
  the old row's `effectiveTo` and inserts a new `version`, so historical rides can always be
  recalculated against the rate card that was active when they were requested).
- **3-tier rate resolution** (`rate-card-resolution.js`): exact match
  (vehicleType + country + fuelType) → category fallback (vehicleType + country, fuelType
  null) → global fallback (default country) — instrumented with a `rateCardResolutionTotal`
  Prometheus counter.

### 2.8 Geo (`modules/geo`) — `/geo`
Country → State → City cascading master data. Public read endpoints for cascading dropdowns
(`/countries`, `/countries/:id/states`, `/states/:id/cities`), full admin CRUD +
enable/disable for all three levels, and `getDefaultCountry()` fallback logic
(`isDefault` flag, else first active by `sortOrder`).

### 2.9 Zone (`modules/zone`) — `/zones`
Geofenced polygons used for surge pricing and area restrictions.
- Public: list/get, `POST /detect` (ray-casting point-in-polygon match), `POST /resolve-hex`
  (fast H3-cell-based zone match).
- Admin: CRUD + enable/disable, `POST /:id/generate-hex-cells` (derives H3 hexagon cells
  from the GeoJSON polygon at a given resolution and rebuilds the Redis index).
- Zone precedence: `sortZonesByPrecedence` ensures higher-priority zones (e.g. airport) win
  over lower-priority overlapping zones (e.g. city-wide surge).
- See `backend/docs/Geofencing-Boundary-Design-Note.md` and `hex-zone-geofencing.md`.

### 2.10 Fare (`modules/fare`) — `/fare`
The fare/pricing engine.
- Public: `POST /estimate` (single vehicle type), `POST /estimate-all` (all active vehicle
  types in parallel).
- Admin: fare-rules CRUD + enable/disable (`/rules`), tax-rules CRUD (`/tax-rules`).
- **`calculateFare`** pipeline (Redis-cached 120s): resolve zone/country from pickup point →
  resolve H3 hex-zone → resolve the applicable rate card (§2.7) → get route data (Google
  Maps Distance Matrix/Directions, haversine+25km/h fallback if no API key) → apply
  time/traffic/zone/demand fare rules in priority order → apply zone/surge multiplier or a
  flat-fare override → apply the minimum-fare floor → apply stacked tax rules → round to the
  country's minor-unit increment. Returns the full breakdown plus `estimatedFareMinor`.

### 2.11 Matching (`modules/matching`) — internal only, no HTTP routes
The driver-matching engine, invoked from `ride.service.js`.
- **Expanding-ring search**: 5km → 10km → 15km, ~25 seconds per ring, each ring excluding
  drivers already considered in a prior ring.
- **Scoring**: `distanceWeight*(1/etaMin) + ratingWeight*(rating/5) + acceptanceRateWeight*acceptanceRate`,
  with the weights themselves admin-configurable via the `matching_weights` table
  (Redis-cached 300s, falls back to hardcoded defaults if no active row).
- **Geo-index** (`driver-geo-index.service.js`): a Redis-backed H3 hex index (resolution 6,
  ~3.72km cells) of online driver positions, updated out-of-order-safely on every location
  ping, self-healing (rebuilds from the DB if Redis is cold).
- **Driver locks** (`driver-lock.service.js`): `SET NX PX` locks prevent two riders' matching
  processes from double-offering the same driver simultaneously.
- **Hard exclusions**: `driver_rider_blocks` — a rider/driver pair that has been explicitly
  blocked is never matched again.
- Instrumented with `matchRingDurationSeconds` and `lockAcquireTotal` metrics.

### 2.12 Ride (`modules/ride`) — `/rides`
The core trip lifecycle.
- Rider: `POST /` (request), `GET /:id`, `POST /:id/cancel`, `POST /:id/rate`,
  `GET /:id/offers`, `GET /:id/history`.
- Driver: `POST /:id/accept|arriving|start|complete|driver-cancel|decline`,
  `GET /driver/active`, `GET /driver/offers`.
- Admin: `GET /` (list all), `GET /:id/offers/admin`, `GET /:id/history/admin`,
  `POST /:id/cancel/admin`.
- Every status transition is appended to `ride_status_history` independently of the mutable
  `rides.status` column, giving a full audit timeline.
- `ride_offers` is the per-driver-per-ring audit trail: one row for every driver offered a
  ride, with `status` (pending/accepted/rejected/expired/superseded), the matching `score`,
  and `radiusKm`/`ring` at the time of the offer.
- On completion, fires `finalizeTripDistance` (§2.18) asynchronously to reconcile GPS-derived
  actual distance/fare against the upfront estimate.

### 2.13 Ride Payment (`modules/ride-payment`) — `/ride-payments`
Per-ride payment settlement (online or cash).
- Rider: `POST /:rideId/initiate`, `POST /:rideId/verify`, `GET /mine`.
- Driver: `POST /:rideId/cash-collect`.
- Shared (ownership-checked): `GET /:rideId`, `GET /:rideId/invoice`.
- Webhook: `POST /webhook/razorpay` (raw-body HMAC-verified).
- Admin: `GET /` (list all).
- In dev mode with no gateway configured, payment auto-completes so the flow can be tested
  end-to-end without real payment credentials.

### 2.14 Subscription (`modules/subscription`) — `/subscriptions`
Driver membership plans — **the platform's core monetization mechanism**.
- Public: `GET /plans`. Driver: `initiate/verify/mine/history`. Webhooks: Razorpay + Stripe.
- Admin: full plan CRUD + enable/disable, per-driver history/payments.
- Activating a subscription flips `drivers.subscriptionStatus = 'active'`; a daily BullMQ job
  (`expireOverdueSubscriptions`) expires overdue subscriptions and also flips the driver
  offline + `subscriptionStatus = 'expired'`, which then blocks `go-online`.

### 2.15 Rider Subscription (`modules/rider-subscription`) — `/rider-plans`
Structurally identical to §2.14 but for rider-facing membership/perk plans — no vehicle-type
or ride-cap concepts, since it doesn't gate any rider capability the way driver subscriptions
gate going online.

### 2.16 Wallet (`modules/wallet`) — `/wallets` (admin-only)
Driver/rider prepaid balance ledger. `GET /` (list, filterable), `GET /driver/:id` (auto-
creates a zero-balance wallet if missing), `GET /rider/:id` (nullable), `GET /:walletId/transactions`,
`POST /driver|rider/:id/adjust` (row-locked `FOR UPDATE` transaction, rejects going negative,
appends an immutable `wallet_transactions` ledger entry, writes an audit log).

### 2.17 Tracking (`modules/tracking`) — `/tracking`
Live ride tracking, split into two phases stored in Redis:
- **Approach phase**: `computeApproachRoute` (driver→pickup route, cached 1hr), remaining
  ETA recomputed on every location ping.
- **Trip phase**: `initTripTracking` decodes the pickup→drop polyline; `updateTripProgress`
  projects each GPS ping onto the route to compute covered/remaining distance and progress %.
- `GET /:rideId` (rider) and `GET /:rideId/driver` (driver) expose the current aggregate
  tracking state; Redis keys are cleaned up once the ride ends.

### 2.18 Trip GPS (`modules/trip-gps`) — `/flagged-trips` (admin only) + internal services
GPS ping ingestion, quality filtering, and fare-deviation dispute handling.
- **Ping buffering**: every driver location update during a trip is buffered into Redis
  (`bufferGpsPing`), then a BullMQ job flushes it every 60 seconds
  (`flushRidePings` → classify → bulk-insert into `trip_gps_pings`).
- **Classification** (pure functions in `gps-ping.service.js`): a ping is marked `isNoise` if
  accuracy > 50m or an implied speed > 180km/h, and `gapFlag` if the time since the previous
  valid ping exceeds 90 seconds.
- **Fare reconciliation** (`finalize-trip.job.js`, fired from `completeRide`): computes the
  actual cumulative trip distance from valid GPS pings, recomputes the fare using the exact
  rate card stamped on the ride at request time, and checks `shouldFlagDeviation` — if the
  GPS-derived actual fare exceeds the upfront estimate by more than **20%**
  (`DEVIATION_THRESHOLD_PCT`), the ride is inserted into `flagged_trips` for manual review
  instead of being auto-billed.
- **Admin review** (`/flagged-trips`): `GET /`, `GET /:id`, `PATCH /:id/approve` (bills the
  GPS-recomputed fare), `PATCH /:id/adjust` (bills a manually specified amount).

### 2.19 Admin (`modules/admin`) — `/admin` (admin-only)
`GET /dashboard` (aggregate driver/rider/ride/subscription counts), `GET /stats/rides?days=`,
`GET /stats/subscriptions`, `GET /audit-logs` (filterable), `GET /ride-history?rideId=`.

### 2.20 Payment (`modules/payment`) — internal only
Gateway abstraction layer. `getGateway(name)` / `gatewayForCurrency(currencyCode)` maps
INR→Razorpay, CAD→Stripe (returns `null` = "dev mode, auto-complete" if unconfigured).
`gateways/razorpay.gateway.js` and `gateways/stripe.gateway.js` each implement
`createPlan`, `createOrder`, `verifyPayment`, `verifyWebhookSignature`, `parseWebhookEvent`.
See `backend/docs/multi-country-payments-design.md`.

### 2.21 Notification (`modules/notification`) — internal only
`sendPush`/`sendPushMulticast` via Firebase Admin SDK, falling back to console logging if
Firebase isn't configured. Driven by the Kafka `notification-service` consumer.

### 2.22 Dev Storage (`modules/dev-storage`) — `/dev-storage` (dev-only, no auth)
A local-disk stand-in for the S3 presigned-URL contract, so file uploads work in local
development without a real S3-compatible bucket configured.

---

## 3. Backend supporting infrastructure

- **Sockets** (`src/sockets`): Socket.IO on Fastify's raw HTTP server. `/driver` namespace —
  JWT-verified, room `driver:{driverId}`, events `go_online`/`go_offline`/`location_update`/
  `ride:accept`/`ride:decline`. `/rider` namespace — room `rider:{riderId}`, events
  `ride:subscribe`/`unsubscribe`. Actual event emission to clients happens in the Kafka
  `ride-socket-bridge` consumer, which bridges ride/driver Kafka topics into these rooms.
- **Kafka** (`src/config/kafka.js`): 18 topics (`TOPICS` enum) — ride lifecycle, driver
  status/location, registration, fare (declared, unused), payments, notifications,
  subscriptions, audit log. 4 consumer groups: `notification-service`, `audit-service`,
  `ride-socket-bridge`, `subscription-service` (currently a logging placeholder for future
  CRM/analytics integration). See `backend/docs/redis-kafka-bullmq-overview.md`.
- **BullMQ jobs** (`src/jobs`): `subscription-expiry` (daily cron, expires overdue driver
  subscriptions), `ride-timeout` (declared, currently a no-op safety net — real timeout
  handling lives in the matching engine's own ring timers), `gps-ping-flush` (every 60s).
- **Middleware** (`src/middleware/authenticate.js`): `authenticateRider`, `authenticateDriver`,
  `authenticateAdmin` (admin or super_admin), `authenticateAny` (any valid JWT — ownership
  is checked in the service layer).
- **Plugins** (`src/plugins`): raw-body capture (webhook HMAC), Helmet, CORS, Redis-backed
  rate limiting (100 req/min/IP), JWT, multipart (5MB), Swagger UI, Prometheus metrics
  (`GET /metrics`), and a production-safe global error handler.
- **Utils** (`src/utils`): `h3.js` (H3 hexagon geo-indexing — resolution 9 for zones,
  resolution 6 for the driver index), `maps.js` (single Google Maps access point with
  haversine fallback, polyline decode, route-progress projection), `metrics.js` (5 custom
  Prometheus instruments), `storage.js` (S3-compatible presigned URLs), `otp.js`/`emailOtp.js`
  (rate-limited, lockout-protected OTP flows), `response.js` (the `sendSuccess`/`sendError`/
  `sendList` envelope convention used everywhere).

---

## 4. Admin Portal (`portal/`) — 15 features

React 19 + Vite + TypeScript, Tailwind v4, Radix/shadcn UI, TanStack Query + Table,
react-hook-form + zod, react-router. Every list page follows the same layered pattern:
`pages/ → components/ → hooks.ts → api.ts → apiClient`.

Two access tiers: a base admin sees **Dashboard, Users, Drivers Approval, Rides Management,
Ride Payments**; a **super_admin** additionally sees **Vehicle Types, Zones Geofence,
Locations, Fare Rules, Subscription Plans, Rider Plans, Wallets, Audit Log, Onboarding
Config**.

| Feature | Nav item | Core capability |
|---|---|---|
| `dashboard` | Dashboard | Stat tiles (active riders, online drivers, pending approvals, active subscriptions) + a Recharts ride-analytics area chart |
| `users` | Users | Rider list/search/CSV-export, bulk block/unblock, detail page with embedded wallet + subscription + recent rides/payments |
| `drivers` | Drivers Approval | Driver list/search/CSV-export, bulk-approve, full detail page (vehicles, documents, onboarding answers, wallet, subscription), per-document approve/reject, request-more-documents |
| `rides` | Rides Management | Ride list/filter/CSV-export, details dialog with state timeline + driver offers/bids panel, admin-initiated cancel |
| `ride-payments` | Ride Payments | Payment ledger list/filter (status/method/gateway/country), per-ride payment history, invoice download |
| `vehicle-types` | Vehicle Types | Vehicle category CRUD + enable/disable, per-country rate-card editor |
| `zones` | Zones Geofence | Geofence CRUD + enable/disable, raw-coordinate polygon entry, "Detect Zone" lat/lng test tool |
| `geo` | Locations | Tabbed Countries/States/Cities master-data CRUD with cascading filters, reused platform-wide via `useGeoFilterSchema` |
| `fare-rules` | Fare Rules | Rule CRUD with dynamic fields per rule type (time/traffic/zone/demand), view-details dialog, enable/disable |
| `subscriptions` | Subscription Plans | Driver plan CRUD (price, duration, trial, features, max rides/day) |
| `rider-plans` | Rider Plans | Rider plan CRUD (same shape, no ride-cap field) |
| `wallets` | Wallets | All-wallets list, transaction ledger view, credit/debit adjustment dialog |
| `audit-logs` | Audit Log | Read-only, filterable by actor type + action |
| `onboarding-config` | Onboarding Config | 3-tab console: document types + country/vehicle-type requirement scoping, questionnaire questions + options + conditional logic, legal-document version publishing |
| `auth` | (login only) | Admin login form, session stored in LocalStorage, 1-hour idle-timeout auto-logout |

**Shared infrastructure** used across most features: `AutoFilters` (URL-synced declarative
filter bar), a generic `DataTable` (TanStack Table wrapper with server pagination/sorting/row
selection), a Cmd/Ctrl+K `GlobalSearch` palette (riders + drivers + static nav pages, filtered
by role), CSV export (`downloadCsv`, reusing the list endpoint at `limit=5000`), and invoice
download. Note: the only DELETE endpoints anywhere in this system are for child scoping
rules (document requirements, onboarding-question options) — never for master records
(riders/drivers/countries/etc.), consistent with the project's no-delete-on-master-data rule.

---

## 5. Rider Mobile App (`app/ride_sharing_customer/`) — 7 features

Flutter, `flutter_bloc` state management, `get_it` DI, `go_router` routing, `dio` HTTP,
`freezed`/`equatable` models. This is the **only** mobile app in the repo — there is no
separate driver app yet (drivers currently interact only via the backend/Socket.IO, with no
dedicated client).

| Feature | Screens | Notes |
|---|---|---|
| `auth` | Splash, onboarding carousel, login, signup, OTP, forgot-password | Login/signup/OTP/forgot-password are **mocked locally** (simulated delay, no real HTTP call except `logout`) |
| `home` | Map landing page + navigation drawer | Current location and place search are backed by **local mock JSON assets**, not a live API |
| `booking` | Select pickup/destination, ride options with fare calc | Calls the real `GET /vehicle-types` endpoint; fare math (`base + distance*perKm + duration*perMin`) is computed client-side |
| `ride_tracking` | Live tracking map, driver info card | Fully **simulated**: a 600ms timer interpolates a mock driver along a generated route through arrival→trip→completion phases; on completion it directly mutates cached wallet/ride-history data |
| `wallet` | Balance + recent activity, add funds, transaction list | **Local-only** — no backend wallet endpoint is called; balance/transactions are cached in Hive, seeded from a mock asset |
| `profile` | Profile view/edit, ride history, ride detail/receipt, saved places, payment methods, settings, help/FAQ | Profile and ride history **do** call real endpoints (`GET/PATCH /riders/profile`, `GET /riders/rides`) with a Hive-cache fallback; saved places/payment methods are local-only |
| `notifications` | Notification inbox | **Local-only** — Hive cache seeded from a mock asset, no push-notification wiring into the UI yet |

**Core shared infrastructure** (`lib/core/`): `constants` (design tokens + mock-asset paths),
`errors` (`Failure` hierarchy: Server/Cache/Location/Auth), `network` (`DioClient` — injects
the bearer token, exposes a mock-JSON-asset fallback loader), `services`
(`StorageService` — secure storage for the auth token, Hive for cache/theme), `theme`
(Material 3 light/dark, persisted), `utils` (`LocationHelper` — haversine distance, bearing,
route-point interpolation, all pure functions), `widgets` (`AppMapView`/`MockMapView` — the
map defaults to a mock rendering, so the app compiles and looks right without a Google Maps
API key; shared `CustomButton`/`CustomTextField`/`LoadingView`/`ErrorView`/`EmptyView`).

> **Important caveat for anyone building against this app**: most of its "live" feel (ride
> tracking, wallet, home map, notifications, most of auth) is currently backed by local mocks
> and Hive caching rather than the real backend. Only vehicle-type lookup and rider
> profile/ride-history are wired to real REST endpoints today.

---

## 6. Database — 37 tables across 8 domains

Full column-level detail and every relationship is in
[`diagrams/database-er-diagram.mermaid`](diagrams/database-er-diagram.mermaid). Summary by
domain:

1. **Geo/Localization**: `countries`, `states`, `cities`, `zones`, `languages`, `translations`
2. **Users/Drivers/Admins**: `users` (riders), `drivers`, `admins`, `driver_devices`
3. **Driver Onboarding & Documents**: `onboarding_questions`, `onboarding_question_options`,
   `driver_onboarding_answers`, `document_types`, `document_type_requirements`,
   `driver_documents`, `legal_documents`, `driver_legal_acceptances`
4. **Vehicles & Pricing**: `vehicle_types`, `driver_vehicles`, `vehicle_type_pricing`,
   `fare_rules`, `tax_rules`
5. **Rides/Matching/GPS/Safety**: `rides`, `ride_offers`, `ride_status_history`,
   `matching_weights`, `driver_rider_blocks`, `trip_gps_pings`, `flagged_trips`
6. **Subscriptions/Payments/Wallets**: `subscription_plans`, `subscriptions`,
   `rider_subscription_plans`, `rider_subscriptions`, `payments`, `wallets`,
   `wallet_transactions`
7. **Admin/Audit**: `audit_logs`

**Notable design choices**: no Postgres `pgEnum` types are used anywhere — every status/
category field is a plain `varchar` with allowed values documented in code comments only
(also called out in the ER diagram). `vehicle_type_pricing` is fully versioned (never
mutated in place) so historical rides remain recalculable. `payments` is a generic ledger
with exactly one of `subscriptionId`/`riderSubscriptionId`/`rideId` set per row, supporting
retries across a subscription's or ride's lifetime.

---

## 7. Cross-cutting platform capabilities

- **Multi-country / multi-currency**: countries carry their own currency code, timezone,
  rounding increment, and default language; pricing, tax, subscription plans, and payments
  are all scoped per country.
- **Multi-language**: a generic `translations` table lets any admin-editable entity (onboarding
  questions/options, document types, legal docs, vehicle types) have per-language overrides.
- **Geofencing & surge**: GeoJSON polygons converted to H3 hexagon cells for fast point-in-
  zone lookups, feeding both fare-rule zone matching and (indirectly) the driver geo-index.
- **Real-time**: Socket.IO for live driver location and ride-state pushes to connected
  clients, bridged from the Kafka event bus so any consumer (not just sockets) can react to
  the same domain events.
- **Observability**: Prometheus metrics for matching ring duration, lock contention, routing
  fallback rate, GPS ping classification, fare-deviation flags, and rate-card resolution tier.
- **Trust & safety**: driver/rider hard-block pairs, document verification workflow, GPS-based
  fare-deviation detection with manual admin review, full audit logging of admin actions.
- **No hard deletes on master data**: countries/users/riders/drivers/subscriptions and similar
  entities are never DELETEd — only soft-disabled (`isActive`/`isBlocked`) — per project
  convention; DELETE endpoints only exist for child scoping rules (document requirements,
  onboarding-question options).
