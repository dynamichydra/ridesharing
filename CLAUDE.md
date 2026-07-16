# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

This is a subscription-based ride-sharing platform (drivers pay for a subscription instead of
per-ride commission). Three independent projects live in this one repo — there is no root
package.json or monorepo tool tying them together; each is built/run from its own directory.

- `backend/` — Node.js/Fastify REST API (Postgres, Redis, Kafka, Socket.IO, BullMQ)
- `portal/` — React admin web portal
- `app/ride_sharing_customer/` — Flutter rider mobile app (no separate driver app exists yet)

## Backend (`backend/`)

### Commands
```bash
cp .env.example .env          # fill in DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD, JWT secrets,
                               # Twilio/Razorpay/Firebase/S3 keys etc.
docker compose up -d          # starts Redis, Zookeeper, Kafka, Kafka UI — NOT Postgres (that
                               # service is commented out in docker-compose.yml); point
                               # DB_HOST/DB_PORT/etc at whatever Postgres instance you actually run
npm install
npm run kafka:topics          # create all Kafka topics (needed before consumers/producers work)
npm run db:generate           # drizzle-kit generate — diff drizzle/schema/*.js into a new migration
npm run db:migrate            # drizzle-kit migrate — apply pending migrations
npm run db:studio             # Drizzle Studio GUI for the DB
node seed.js                  # full demo dataset (admins, drivers, riders, rides, plans, etc.)
npm run dev                   # node --watch, hot reload
npm start                     # production start
```
Swagger UI → `http://localhost:3000/docs`. Kafka UI → `http://localhost:8080`. A Postman
collection is at `backend/RideShare-API.postman_collection.json`.

Seeded dev logins (from `seed.js`): admin `admin@rideshare.com` / `Admin@123456`, ops admin
`ops@rideshare.com` / `Ops@123456`; driver/rider phone OTPs are just printed to the console in
dev mode (no real SMS/email is sent unless Twilio credentials / an email provider are configured).

### Architecture
- Fastify app assembled in `src/server.js`; cross-cutting plugins (CORS, Helmet, JWT,
  Redis-backed rate limiting, multipart, Swagger, raw-body capture for the Razorpay webhook HMAC)
  are registered in `src/plugins/index.js`. All routes are mounted under `/api/{API_VERSION}`.
- Domain modules live in `src/modules/<domain>/<domain>.{routes,service}.js` — routes do request
  parsing/validation and call into services; services own DB access and business logic. Follow
  this split for any new module.
- DB: Drizzle ORM + Postgres. Every table is its own file in `drizzle/schema/`, re-exported from
  `drizzle/schema/index.js` — a new schema file must be added there or the rest of the app (and
  `drizzle-kit generate`) won't see it.
- Response envelope (`utils/response.js`) is load-bearing convention, not optional: use
  `sendSuccess`/`sendError`/`sendList` everywhere instead of raw `reply.send()`. Single
  object/action → `{ SUCCESS, MESSAGE }`; lists → adds `COUNT` + `PAGINATION`; errors →
  `{ SUCCESS: false, MESSAGE }`.
- Auth: `@fastify/jwt` access tokens; refresh tokens are stored in Redis under
  `REDIS_KEYS.refreshToken(userId, deviceId)`. Driver sessions are device-scoped (see
  `driver_devices` table) so revoking one device's session doesn't log out others; rider/admin
  tokens fall back to a `'default'` device key. Role gates (`authenticateRider`,
  `authenticateDriver`, `authenticateAdmin`, `authenticateAny`) live in
  `src/middleware/authenticate.js`.
- OTP: `utils/otp.js` (phone) and `utils/emailOtp.js` (email) are both Redis-backed with resend
  cooldown, hourly send cap, and wrong-attempt lockout. In dev (`NODE_ENV != production` or no
  Twilio creds), codes are logged to the console instead of actually sent.
- Event-driven pieces: Kafka (`src/config/kafka.js` — `TOPICS` enum + `publishEvent`) carries ride
  lifecycle, driver status, notification, and audit-log events between modules/consumers; BullMQ
  (`src/jobs`) runs scheduled/background work; Socket.IO (`src/sockets`) pushes real-time driver
  location and ride updates to `/driver` and `/rider` namespaces.
- Driver matching (`matching.service.js`): expanding-radius ring search — 5km/10km/15km, ~25s per
  ring, each ring excluding drivers already considered — scored by
  `(1/distance_km)*0.6 + (rating/5)*0.4`.
- Fare engine (`fare.service.js` / `fare-rules.service.js`): per-vehicle-type base/per-km/per-min
  rates, with time/zone/traffic-based multiplier rules applied by priority.
- File uploads (`utils/storage.js`): presigned-URL flow against an S3-compatible bucket (presigned
  PUT for driver uploads, presigned GET for admin review) — needs `S3_ENDPOINT`/`S3_ACCESS_KEY`/
  `S3_SECRET_KEY`/`S3_BUCKET` set to actually work.
- Driver registration/onboarding is a large, admin-configurable system (countries/states/cities,
  document types with per-country/city/vehicle-type requirements, a conditional dynamic
  questionnaire, versioned legal documents, a resumable registration state machine driven by
  `drivers.registrationStatus`/`registrationStep`). Read `backend/docs/driver-registration-design.md`
  (full design) before changing anything in `src/modules/{geo,documents,vehicle,onboarding}` or
  the driver registration flow in `src/modules/driver`.

## Portal (`portal/`)

- React 19 + Vite + TypeScript, Tailwind v4, Radix UI primitives with shadcn-style wrappers in
  `src/components/ui`, TanStack Query for server state, TanStack Table for grids, react-hook-form
  + zod for forms, react-router for routing.
- Feature-based structure: `src/features/<domain>/` (`auth`, `dashboard`, `drivers`, `fare-rules`,
  `rides`, `subscriptions`, `users`, `vehicle-types`, `zones`) — each feature owns its own
  components and data-fetching hooks.
- Commands: `npm run dev`, `npm run build` (`tsc -b && vite build`), `npm run lint` (oxlint),
  `npm run preview`.

## Mobile app (`app/ride_sharing_customer/`)

- Flutter rider app — this is the only mobile app in the repo today; there is no separate driver
  app yet. Clean-architecture-style feature folders: `lib/features/<name>/{data,domain,presentation}`
  (`auth`, `booking`, `home`, `notifications`, `profile`, `ride_tracking`, `wallet`), shared code in
  `lib/core/{constants,errors,network,services,theme,utils,widgets}`.
- State management: `flutter_bloc`. DI: `get_it`. Routing: `go_router`. HTTP: `dio`. Data
  classes: `freezed`/`equatable`.
- Standard Flutter tooling from this directory: `flutter pub get`, `flutter run`, `flutter test`.
