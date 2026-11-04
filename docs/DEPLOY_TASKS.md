# Deploy-Readiness Task List

Tracks the fixes from [PRODUCTION_READINESS_AUDIT.md](PRODUCTION_READINESS_AUDIT.md). Each task is small and self-contained;
IDs in brackets refer to the audit.

Legend: `[x]` done in code · `[ ]` not started · `[~]` partially done (see note) · 👤 needs you (credentials/accounts/infra)

**Status (2026-11-04):** Phases 1–5 are done in code (uncommitted in the working tree). Backend tests: 254/257 pass. The 3
failures existed before these changes and depend on Firebase config and DB state. Portal `npm run build` passes and lint has warnings only. Phase 0 and "Later" remain.

## Phase 0 — Owner actions (cannot be done in code)
- [ ] 👤 T0.1 Rotate every secret that was in the committed `backend_v2/back.zip` `.env` (DB, JWT, Razorpay/RazorpayX, Stripe, Firebase, Maps, `BANK_DETAILS_ENC_KEY`) [P0-12]
- [ ] 👤 T0.2 Purge `backend_v2/back.zip` and `backend_v2/src.zip` from git history (`git filter-repo`) and force-push; enable GitHub secret scanning [P0-12]. (`*.zip` is now in `.gitignore`.)
- [ ] 👤 T0.3 Set `RAZORPAY_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET` in the server env. Webhooks are now rejected without them [P0-5]
- [ ] 👤 T0.4 Configure S3/R2 for production uploads; restrict the Google Maps key by HTTP referrer / app signature (the old key is in git history, so rotate it)
- [ ] 👤 T0.5 Production env: set `CORS_ORIGINS` (portal URL), Twilio, SMTP, `DB_SSL_CA`, `METRICS_TOKEN`, a short `JWT_EXPIRES_IN` (e.g. `15m`). See `backend_v2/.env.example`

## Phase 1 — Security blockers (P0)
- [x] T1.1 Cryptographically random OTP, stored hashed; dev fixed code only via `OTP_DEV_CODE` outside production; 5 verify attempts / 5 sends per hour [P0-1]
- [x] T1.2 Per-IP rate limits on OTP send/verify, region check, admin login, refresh [P0-1]
- [x] T1.3 Dev/test routes (`socket-test`, quick-auth, HTML simulators, `/` and `/test` socket namespaces) only when `ENABLE_DEV_TOOLS=true` outside production [P0-2]
- [x] T1.4 Local dev storage: only without S3, never in production unless `ALLOW_LOCAL_STORAGE=true`; uploads need a signed URL or a bearer token [P1-20]
- [x] T1.5 Public mock payout-account approval removed (dev tools only) [P0-3]
- [x] T1.6 Webhooks rejected when the signing secret is missing; constant-time HMAC compare [P0-5]
- [x] T1.7 `assertPaymentDevBypassAllowed()`: ride / wallet / rider-subscription fail closed (503) unless `PAYMENTS_DEV_BYPASS=true` outside production; dev signatures/mock refs behind the same flag [P0-6]
- [x] T1.8 Ride payment verify bound to the attempt (order + ride + payer) and amount; webhook handler requires the attempt and a matching amount [P0-4]
- [x] T1.9 `verifyCapturedPayment()` on Razorpay (fetches payment: order, status, amount, currency) and Stripe (intent status, amount, currency) [P0-4]
- [x] T1.10 Driver and rider subscription verify and webhooks bound to the attempt (owner, planId, price incl. group pricing) [P0-7]
- [x] T1.11 `utils/public-dto.js` `toPublicDriver()` used for rider-facing accept payloads [P0-9]
- [x] T1.12 `ride:subscribe` socket checks ride ownership; driver `location_update` validates coordinates and clock skew [P1-11]
- [x] T1.13 `assertRequiredEnv()` refuses unsafe production config (dev switches, fixed OTP, missing Twilio, missing webhook secrets when keys set, empty `CORS_ORIGINS`, malformed encryption key)
- [x] T1.14 *(found while fixing)* Matching admin routes, `/cash/*` and `/financial-audit/*` accepted **any** logged-in user (riders could edit dispatch policies and read all cash/financial records). Now properly role-gated

## Phase 2 — Money & ride correctness
- [x] T2.1 Payout reservation debits the wallet inside the locking transaction; one in-flight payout per driver; compensating credit on gateway failure [P0-8]
- [x] T2.2 `postTransaction({ tx })` posts inside a caller's transaction [P0-8]
- [x] T2.3 Tips charged from the rider wallet → driver wallet in one ledger transaction under a ride row lock; 10s double-tap guard; max tip cap [P0-13]
- [x] T2.4 Driver cancel re-dispatches the ride (15-min cooldown for the cancelling driver); state machine allows `accepted/arriving/arrived → searching` [P0-14]
- [x] T2.5 Matching reconciliation doesn't expire a ride whose latest dispatch run is still active [P0-14]
- [x] T2.6 SOS: SMS sent directly to each trusted contact (with map link), real-time `sos:triggered` to admin sockets, allowed at `arrived` [P0-10]
- [x] T2.7 Notification consumer honours an explicit `phone` on SMS payloads [P0-10]
- [x] T2.8 Kafka producer reconnects (15s cooldown) instead of latching off; `publishEventStrict` for the outbox relay so failed sends are retried [P0-11]
- [x] T2.9 Status-guarded updates for scheduled/rider cancel, arrived, no-show, admin cancel; riders can cancel at `arrived` [P1-8]
- [x] T2.10 No-show needs `NO_SHOW_MIN_WAIT_SEC` (default 300s) of waiting, uses the city cancellation fee when configured, earnings `pending` [P1-7]
- [x] T2.11 Online/card/wallet ride earnings `pending` until payment is captured [P1-15]
- [x] T2.12 Cash collection refused for rides the rider is paying online (unless that charge failed) [P1-18]
- [x] T2.13 Duplicate direct Kafka publishes removed for accepted/started/completed (outbox carries them) [P2-1]
- [x] T2.14 Start OTP from `crypto.randomInt` [P2-3]

## Phase 3 — Auth hardening
- [x] T3.1 Blocked/suspended riders and drivers, and deactivated admins, lose access on the next request (30s Redis cache, invalidated on block/unblock); refresh also checks block state and revoked devices [P1-1, P1-5]
- [x] T3.2 Legacy driver OTP verify checks the blocked flag [P1-2]
- [x] T3.3 Bare 10-digit numbers that match more than one driver → `PHONE_AMBIGUOUS` [P1-3]
- [x] T3.4 OTP/phone debug logs removed; SMS/email bodies never logged in production; email codes via SMTP [P1-4]
- [x] T3.5 Admin login: lockout after 5 failures for 15 min, case-insensitive email, constant-time miss [P1-6]
- [x] T3.6 `authenticateSuperAdmin` on 81 write routes the portal already restricts (wallet adjust/withdrawals, payouts, refunds, pricing, commission, tax, promos, plans, geo, zones, vehicles, FX, driver groups, reconciliation) [P1-6]

## Phase 4 — Platform / deploy
- [x] T4.1 CORS + Socket.IO CORS allow-list from `CORS_ORIGINS` [P1-19]
- [x] T4.2 Redis connected before plugins so rate limits are shared; Redis required in production [P1-13]
- [x] T4.3 Socket.IO Redis adapter (`@socket.io/redis-adapter`) [P1-13]
- [x] T4.4 BullMQ `upsertJobScheduler` (`jobs/scheduler.js`) instead of `obliterate()` on every boot; outbox relay on one shared scheduler [P1-13]
- [x] T4.5 `scanKeys()` instead of `KEYS` [P1-13]
- [x] T4.6 `DB_POOL_MAX` (default 20) + `DB_SSL_CA` certificate verification [P1-13, P2-9]
- [x] T4.7 `/health` (liveness) + `/ready` (DB/Redis, time-boxed); `/metrics` needs `METRICS_TOKEN` in production; `/docs` off in production unless `ENABLE_API_DOCS=true` [P1-22]
- [x] T4.8 Exit on `uncaughtException`; graceful shutdown closes HTTP, Kafka consumers/producer, Redis, DB (15s hard stop); log redaction; `LOG_LEVEL` [P1-21]
- [x] T4.9 Empty-body guard so missing JSON bodies don't crash handlers [P1-14]
- [x] T4.10 S3 presigned PUT no longer pins `ContentLength` [P1-20]
- [x] T4.11 Multi-stage Dockerfile (non-root, healthcheck, separate `migrate` target) + tightened `.dockerignore` [P2-11]
- [x] T4.12 `.env.example` documents every new variable; encryption-key instructions fixed [P1-12]
- [x] T4.13 `server.js` exports `build()` and only auto-starts when run directly (enables smoke tests)
- [x] T4.14 `test/deploy-hardening.test.js` (7 tests)

## Phase 5 — Portal
- [x] T5.1 "Simulate Stripe approval" only in dev builds [UI-1]
- [x] T5.2 Hard-coded Google Maps / Stripe / Razorpay fallback keys and the fake `PRIVATE_KEY` removed [UI-4, UI-6]
- [x] T5.3 Session validated against `/admin/me` (role/active status from the server, cached 5 min) [UI-2]
- [x] T5.4 `ProtectedRoute` redirects before rendering protected content [UI-9]
- [x] T5.5 Notification-template HTML preview sanitized (DOMPurify) [UI-7]
- [x] T5.6 `BackendResponse.PAGINATION` type fixed, which also fixed the support tickets page total count [UI-8]
- [x] T5.7 Dead fare API clients (non-existent endpoints) deleted [UI-5]
- [x] T5.8 Portal `.env.example`

## Behaviour changes to know about
- **Local dev:** OTPs are random now (printed to the console). Set `OTP_DEV_CODE=123456` locally for the old fixed code. Without gateway keys, payments return 503 unless `PAYMENTS_DEV_BYPASS=true`.
- **Regular admins** (not `super_admin`) now get 403 on pricing/money writes, including wallet adjust from the driver/rider detail pages. Hide those buttons for non-super-admins in the portal (wallet panel had uncommitted local edits, so it was left untouched).
- **Rider app:** tips are paid from the wallet (`INSUFFICIENT_WALLET_BALANCE` 422 when it can't cover them); `ride:subscribe` errors arrive as `ride:subscribe_error`; drivers can't declare no-show before 5 min (`NO_SHOW_TOO_EARLY`).
- `DELETE /geo/admin/cities/:id` still exists (now super-admin only) — conflicts with the no-hard-delete rule for master data; decide whether to replace it with disable.

## Later (tracked, not in this pass)
- [ ] L1 JSON-schema validation for every route [P1-14]
- [ ] L2 Queue-based (BullMQ) matching instead of in-process loop [P1-9]
- [ ] L3 Ghost-driver heartbeat sweep + GPS spoofing heuristics [P1-10]
- [ ] L4 Encrypt Aadhaar/licence numbers at rest + backfill migration [P1-12]
- [ ] L5 Admin MFA, maker-checker approvals, full permission model [P1-6]
- [ ] L6 Non-withdrawable promotional wallet balance [P1-17]
- [ ] L7 httpOnly cookie admin session [UI-3]
- [ ] L8 Portal screens: rider withdrawals, ride disputes, financial audit, notification history, vehicle inspections [§8.3]
- [ ] L9 Rider app: upload avatars via presigned S3 URL instead of `/dev-storage`
- [ ] L10 CI pipeline with a dedicated test database; load test
- [ ] L11 Hide super-admin-only actions (wallet adjust, etc.) from regular admins in the portal UI
