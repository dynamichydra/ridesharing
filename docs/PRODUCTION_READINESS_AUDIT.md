# RideShare Platform — Production Readiness Audit

**Scope:** `backend_v2/` (Node.js / Fastify API) and `portal/` (React admin portal)
**Date:** 2026-11-04
**Branch / commit audited:** `main` @ `d0b3c90` (plus uncommitted portal wallet changes in the working tree)

---

## 1. Verdict

**Not ready for production.** Do not launch with real riders, drivers, or money until every **P0** item in §4 is fixed and re-tested.

The architecture is solid and the feature set is broad: multi-country pricing, a double-entry ledger, an outbox pattern, H3 geofencing, wave-based dispatch, subscriptions, payouts, support, and safety features. The core money and identity paths, though, have defects that can be exploited today:

| # | One-line summary | Why it blocks launch |
|---|---|---|
| 1 | Every OTP is hard-coded to `123456` | Anyone can log in as any rider or driver |
| 2 | Public endpoint mints JWTs for real drivers and riders | Unauthenticated account takeover |
| 3 | Public endpoint approves any driver's payout account | Payout KYC bypass |
| 4 | Payment "verify" proofs aren't bound to the ride or amount | A ₹1 payment can mark any ride paid |
| 5 | Webhook signatures are checked against an empty secret when it isn't configured | Anyone can forge "payment captured" webhooks |
| 6 | No payment gateway configured means money is credited for free | A misconfigured region gives away rides, top-ups, and subscriptions |
| 7 | Driver subscription verify lets you pay for a cheap plan and activate an expensive one | Revenue loss |
| 8 | Concurrent payouts can pay the same balance twice | Direct cash loss |
| 9 | Full driver DB row, including **Aadhaar number** and licence, is pushed to riders | Legal/PII breach (DPDP Act, PIPEDA) |
| 10 | SOS SMS goes to the rider's own phone, not their trusted contacts | Safety feature silently doesn't work |
| 11 | Kafka-down means events are marked "published" and lost | Notifications and audit logs disappear |
| 12 | A git-history zip contains the backend `.env`, pushed to GitHub | Secret exposure |

Rough effort estimate: **P0 ≈ 2–3 weeks** for one experienced backend engineer, **P1 ≈ 3–4 weeks**, then load and security testing before go-live.

---

## 2. How this audit was done

**Read line by line:** `server.js`, `plugins/`, `config/` (env, db, redis, kafka), `middleware/authenticate.js`, all of `utils/` used by auth/money/storage, `auth`, `sockets/` (`index.js`, `support.socket.js`), `kafka/consumers`, `jobs/` (index, outbox relay, matching reconciliation, webhook processing, document expiry), `ride` (service, routes, state machine, chat), `matching` (service, discovery, filter, dispatch wave, reconciliation), `ride-payment`, `wallet`, `ledger`, `payout`, `payout-account` (mock approval path), `subscription`/`rider-subscription` (payment paths), `payment` (gateway selection, Razorpay and Stripe verification), `promo` (limits, referral), `emergency` (SOS), `driver` (go-online), `dev-storage`, `socket-test`. Portal: `lib/`, auth, protected routes, nav and role gating, constants, plus a full endpoint cross-check against the backend.

**Inventoried (exports, routes, and wiring reviewed; internals not deep-reviewed):** the fare engine stages, geo/zone/hex, documents/onboarding, vehicle, support, refunds, reconciliation, payment disputes, ride disputes, fx, moderation, driver groups, flagged trips, tracking, lost items, airport queue, commission resolver, and tax engine. These need a second-pass review (§10).

**Executed:**
- `npm test` in backend_v2: **247 pass / 3 fail out of 250.** Failures: `push-notification.test.js` (Firebase not configured in the env used) and two in `region-aware-saved-payments.test.js` (`CURRENCY_NOT_ALLOWED`, which depends on DB state). ⚠️ The tests load `backend_v2/.env` and run against **whatever database it points at**. Make sure that isn't a shared or production DB.
- `npm run build` in the portal: **passes** (warns about a 760 kB chunk in `list-*.js`).
- `npm run lint` in the portal: **passes with warnings** (about 15 `exhaustive-deps` / fast-refresh warnings, no errors).

**Not done:** no load testing, no live gateway calls, no running app, no penetration testing. Line numbers below are from commit `d0b3c90`.

---

## 3. System overview

### 3.1 Architecture

```
Rider app (Flutter) ─┐                         ┌─ PostgreSQL (Drizzle, ~111 tables, 48 migrations)
Driver app (planned) ─┼─ REST /api/v1 (488 routes) ─┤
Admin portal (React) ─┘   Socket.IO (/driver /rider /admin /support /test /)  ├─ Redis (cache, geo/H3 index, locks, OTP, BullMQ, pub/sub)
                                                  ├─ Kafka (ride, driver, notification, audit, support topics)
                                                  ├─ BullMQ (13 scheduled/background queues)
                                                  └─ Razorpay (IN) · Stripe (CA) · Twilio · FCM · S3/R2 · Google Maps
```

- **Runtime:** a single Node process runs HTTP + Socket.IO + Kafka consumers + BullMQ workers + the in-process matching loop.
- **Pattern:** `modules/<domain>/<domain>.{routes,service}.js`, with responses wrapped in `{ SUCCESS, MESSAGE, COUNT?, PAGINATION? }`.
- **Money:** integer minor units plus ISO currency. Double-entry ledger (`ledger_transactions` / `ledger_entries` / `ledger_accounts`) with wallet side effects applied under `FOR UPDATE`. An hourly ledger verification job runs.
- **Reliability primitives:** an `idempotency_keys` table, an `outbox_events` table with a `FOR UPDATE SKIP LOCKED` relay, and `webhook_events` dedup keyed on (gateway, eventId, domain).

### 3.2 Backend feature inventory (every module)

| Area | Module(s) | What it does | Status |
|---|---|---|---|
| Rider auth | `auth` | Region check (IN/CA via GPS+IP), phone OTP, JWT + refresh | ⛔ P0-1, P1-1..4 |
| Driver auth | `auth` | Device-scoped mobile OTP, email code, legacy OTP, device list/revoke | ⛔ P0-1, P1-2, P1-5 |
| Admin auth | `auth`, `admin` | bcrypt login, `/admin/me` with permissions | ⚠️ P1-6 (no RBAC enforcement, no MFA/lockout) |
| Rider profile | `rider`, `auth/user` | Profile, preferences, FCM token, ride list | OK |
| Saved places | `saved-place` | Home/work/favourites CRUD | OK |
| Trusted contacts / SOS | `emergency` | Contacts, SOS trigger, share token, public tracking | ⛔ P0-10 |
| Driver profile & onboarding | `driver`, `onboarding`, `documents`, `vehicle`, `geo` | 12-step resumable registration, dynamic questionnaire, legal versions, document upload/verify, vehicles and inspections | ⚠️ P1-12 (Aadhaar plaintext), P2 |
| Driver availability | `driver`, `sockets` | go-online/offline, location stream, destination mode, heatmap, performance | ⚠️ P1-9, P1-10 |
| Geo master data | `geo` | Countries, states, cities, currencies, city types and city-type fares | ⚠️ P2-12 (DELETE on cities) |
| Zones / geofencing | `zone` | Polygon + H3 hex zones, reverse index, detect/resolve | Inventoried |
| Vehicle catalog | `vehicle-type`, `vehicle-model` | Vehicle classes and models | OK |
| Fare engine | `fare` | 11-stage pipeline (service area → zone → routing → pricing card → metered → rules → surge → fees → taxes → promo → rounding), quotes with lock, recalculation | ⚠️ P1-14 (public Maps-backed endpoints) |
| Tax | `tax`, `fare/tax-rules` | Tax rules and snapshotting | Inventoried |
| Commission | `commission` | Versioned commission rules, deterministic resolver | ⚠️ P1-16 (silent 20% fallback) |
| Ride lifecycle | `ride` | Request/schedule, accept, arriving, arrived, start (OTP), complete, cancel (rider/driver/admin), no-show, rating, tip, receipt, chat, offers/history | ⛔ P0-9, P0-13, P0-14, P1-7, P1-8 |
| Matching / dispatch | `matching` | Policy hierarchy, H3 + GEO discovery, hard filters, ETA, scoring, waves with Redis locks, airport queue, reconciliation, admin debugger | ⚠️ P1-9, P1-10, P2 |
| Live tracking | `tracking`, `trip-gps` | Approach/trip progress, GPS ping buffering, distance finalisation, flagged trips | Inventoried |
| Ride payments | `ride-payment` | Online (Razorpay/Stripe), saved card, wallet, cash; webhooks; invoices | ⛔ P0-4..6 |
| Saved payment methods | `payment-method`, `payment` | Region-aware setup/attach, PSP router with circuit breaker | Inventoried |
| Wallet | `wallet` | Top-up (with coupons), dues, rider withdrawal requests, admin adjust | ⛔ P0-6, P1-17 |
| Ledger / audit | `ledger`, `admin/commercial-audit` | Double-entry postings, invariants, financial audit | OK design; see P1-15 |
| Driver subscriptions | `subscription` | Plans, versions, entitlements, group pricing, lifecycle (pause/resume/cancel/proration), admin-initiated purchase | ⛔ P0-7 |
| Rider subscriptions | `rider-subscription` | Rider plans and activation | ⛔ P0-6 |
| Driver groups | `driver-group` | Group membership for pricing/plans | OK |
| Payout accounts | `payout-account`, `bank-account` | Stripe Connect onboarding, RazorpayX fund accounts, penny drop | ⛔ P0-3 |
| Payouts | `payout` | Weekly batch + instant payouts, webhooks, reversals | ⛔ P0-8 |
| Refunds | `refund` | Rider request → admin approve/reject, gateway refund, ledger | Inventoried |
| Disputes (chargebacks) | `dispute` | Gateway dispute ingestion, accept/contest | Inventoried (Razorpay payload unverified, per its own comment) |
| Ride disputes | `ride-dispute` | Rider/driver complaints about rides | Backend only, no portal UI |
| Reconciliation | `reconciliation` | Gateway vs ledger diff runs, mismatch severity/resolution | Inventoried |
| Cash | `cash` | Cash collection reports, disputes, verification | ⚠️ P1-18 |
| Promos & referrals | `promo` | Ride and top-up promo codes, referral rewards | ⚠️ P1-17 |
| FX | `fx` | Rates, quotes, conversion | OK |
| Notifications | `notification`, `notification-template` | Template-driven push/SMS/email via Kafka, in-app history | ⚠️ P0-11 |
| Moderation | `moderation` | Profanity scan, review queue | OK |
| Lost items | `ride/lost-item` | Report and track lost items | OK |
| Support | `support`, `sockets/support` | Categories, FAQs, tickets, messages, CSAT, SLA/auto-close jobs, live chat | Inventoried |
| Admin dashboard | `admin`, `sockets /admin` | KPIs, dispatch queue, alerts, supply/demand, heatmap, 20s push | ⚠️ P2-5 |
| Dev/test tooling | `dev-storage`, `socket-test`, `portal/*.html` | Local file store, socket test UIs, **token minting** | ⛔ P0-2, P1-11 |

**Background jobs (BullMQ):** subscription expiry (daily), GPS ping flush (60s), ledger verification (hourly), reconciliation, payout batch (weekly), outbox relay (self-rescheduling), outbox prune, scheduled-ride dispatch (30s), document expiry (daily), matching reconciliation (60s), support SLA/auto-close/CSAT, webhook processing.

**Kafka consumers:** notification-service, audit-service, ride-socket-bridge, subscription-service (log only).

---

## 4. P0 — Launch blockers (fix before any real traffic)

### P0-1 · All OTPs are hard-coded to `123456`
- **Where:** `backend_v2/src/utils/otp.js:11` (`return "123456";`); `MAX_VERIFY_ATTEMPTS = 20` at `:7`.
- **Impact:** anyone can log in as any rider or driver whose phone number they know, which is full account takeover. The driver path also auto-creates accounts.
- **Fix:** `crypto.randomInt(100000, 1000000)`, store a hash rather than the plaintext code, lower verify attempts to 5, add **per-IP and per-device** send/verify limits (today the limits are per-phone only, so SMS pumping across many numbers is unbounded), and integrate Twilio Verify or a DLT-registered Indian SMS provider.

### P0-2 · Public JWT minting endpoint
- **Where:** `src/modules/socket-test/socket-test.routes.js:42` (`GET /socket-test/quick-auth?role=driver&index=N`), registered both at `/api/v1` and at root (`src/server.js:124-125`).
- **Impact:** an unauthenticated caller receives a valid access token for any of the first 10 real drivers or the first rider.
- **Fix:** delete it, or register `socketTestRoutes` only when `NODE_ENV === 'development'`. Also remove the `/portal/driver|rider|simulator` HTML pages and the public `/` and `/test` socket namespaces from production builds.

### P0-3 · Public endpoint approves any driver's payout account
- **Where:** `src/modules/payout-account/payout-account.routes.js:44` → `approveMockStripeAccount()` (`payout-account.service.js:84`). It has no auth: `GET /api/v1/payout-accounts/stripe/onboarding-return?driverId=<id>`.
- **Impact:** it sets any driver's payout account to `approved` with `stripePayoutsEnabled: true` and a fake `acct_mock_*`, skipping KYC and admin review. It also overwrites Indian drivers' gateway to `stripe`. The portal calls it from the "simulate Stripe approve" button (`portal/src/features/bank-details/components/bank-details-panel.tsx:154`).
- **Fix:** make the return URL informational only. Account status must come solely from the Stripe `account.updated` Connect webhook or an authenticated admin action. Remove the mock path and the portal button in production.

### P0-4 · Payment verification isn't bound to the ride, the payer, or the amount
- **Where:** `src/modules/ride-payment/ride-payment.service.js:134` (`verifyRidePayment`), `src/modules/payment/gateways/razorpay.gateway.js:310`, `src/modules/payment/gateways/stripe.gateway.js:238`.
- **Problem:** Razorpay verify only checks `HMAC(orderId|paymentId)`. Stripe verify only checks that the PaymentIntent `succeeded`. Neither checks that the order belongs to this ride or rider, or that the paid amount equals the fare. If no `payments` row matches `(orderRef, rideId)`, the ride is still marked paid.
- **Exploit:** pay a ₹1 wallet top-up, then submit that `orderRef/paymentRef/signature` to `/ride-payments/<expensive-ride>/verify`. The ride is marked paid and the driver is credited.
- **Fix:** require an existing `payments` row with `gatewayOrderId = orderRef AND rideId = :rideId AND payerId = rider AND status = 'created'`. Fetch the payment or intent from the gateway and assert `amount`, `currency`, `status = captured/succeeded`, and that `metadata.rideId` matches. Use `crypto.timingSafeEqual` for HMAC comparisons. Apply the same rule to the webhook handler (`processWebhookEvent` trusts `event.metadata.rideId` and doesn't check the amount).

### P0-5 · Webhook signatures are verified against an empty secret
- **Where:** `razorpay.gateway.js:320` (`env.RAZORPAY_WEBHOOK_SECRET || ''`), `stripe.gateway.js:253` and the Connect equivalent (`STRIPE_*_WEBHOOK_SECRET || ''`).
- **Impact:** the current `backend_v2/.env` sets Razorpay keys but leaves `RAZORPAY_WEBHOOK_SECRET` commented out. The gateway therefore reports "configured", and anyone can compute a valid HMAC with an empty key and forge `payment.captured` events for rides, subscriptions, and payouts.
- **Fix:** if a webhook secret is missing, reject all webhooks (and fail `assertRequiredEnv()` in production when the matching gateway keys are set).

### P0-6 · Unconfigured gateway means a free credit (fail-open money paths)
- **Where:**
  - Ride: `ride-payment.service.js:100-107` and `:146-151` (`gateway: 'none'` marks the ride paid; in verify, *any* `paymentRef` is accepted).
  - Wallet top-up: `src/modules/wallet/wallet.service.js:112-116` (credits the wallet directly, so a driver can also clear dues for free via `payMyDues`).
  - Rider subscription: `src/modules/rider-subscription/rider-subscription.service.js:94-98` and `:131-136`.
  - Razorpay dev signatures `dev_signature`/`test_signature` and Stripe `mock_*` refs are accepted whenever `NODE_ENV !== 'production'` (a staging server with real keys and `NODE_ENV=staging` is exploitable).
- **Impact:** if one region's keys are missing or expire (for example, Stripe for Canada), riders get free rides, free wallet balance (which can then be withdrawn, see P1-17), and free subscriptions.
- **Fix:** in production, throw `503 PAYMENT_GATEWAY_UNAVAILABLE`. Allow the dev shortcuts only behind an explicit `PAYMENTS_DEV_BYPASS=true` flag that `assertRequiredEnv()` forbids in production.

### P0-7 · Driver subscription: plan swap and order replay
- **Where:** `src/modules/subscription/subscription.service.js:558-575`.
- **Problem:** the payment attempt is looked up by `gatewayOrderId` only, not bound to `driverId` or `planId`. `planId` comes from the request body and activation uses that plan, while `amountMinor` comes from the attempt. If no attempt exists, it proceeds anyway.
- **Exploit:** pay for the cheapest plan, then verify with the most expensive `planId` and the same order proof.
- **Fix:** store `driverId`, `planId`, and `planVersionId` on the attempt at initiate, require all three to match at verify, and re-check the gateway amount.

### P0-8 · Double payout race
- **Where:** `src/modules/payout/payout.service.js:93` (`_executePayout`).
- **Problem:** the wallet row is locked only while the `payouts` row is inserted. The wallet isn't debited until **after** the external gateway call, in a separate ledger post. Two concurrent payouts (driver double-taps `/payouts/me/instant` with two idempotency keys, or the batch job and an instant payout overlap, or two instances run the batch) both reserve the full balance and both pay. And if the post-payout ledger post fails, the balance stays and gets paid again in the next batch.
- **Fix:** inside the locking transaction, debit the wallet into a `payout_pending` liability account (a ledger post in the same tx) before calling the gateway. On failure or reversal, post a compensating entry. Add a partial unique index such as "one `pending` payout per driver".

### P0-9 · Driver PII (Aadhaar, licence, email, FCM token) is broadcast to riders
- **Where:** `src/modules/ride/ride.service.js` `acceptRide`. `driverDetails` is the **full `drivers` row** (`select().from(drivers)`) and is emitted to the rider via socket (`ride.service.js:667`, `driver: driverDetails`) and via the Kafka `RIDE_ACCEPTED` payload that the bridge forwards. The row includes `aadharNumber`, `aadharDoc`, `licenseNumber`, `licenseDoc`, `email`, `fcmToken`, `approvalNote`, and `dateOfBirth` (`drizzle/schema/drivers.js:34`).
- **Impact:** every rider receives their driver's Aadhaar number and document links. That is a reportable breach under India's DPDP Act 2023, and Aadhaar has its own usage restrictions. Canada (PIPEDA) has similar exposure.
- **Fix:** emit an explicit allow-list DTO (`id, name, profilePhoto, rating, vehicleNumber, vehicleModel, masked phone`). Grep every `select().from(drivers)` / `select().from(users)` that reaches a response or socket.

### P0-10 · SOS alerts never reach trusted contacts
- **Where:** `src/modules/emergency/emergency.service.js:95-104` publishes `NOTIF_SMS` with `phone: contact.phone`, but the consumer ignores `payload.phone` and resolves the phone from `payload.userId`, which is **the rider** (`src/kafka/consumers/index.js:110`). It also depends on Kafka (see P0-11) and doesn't alert admins in real time. `arrived` isn't in SOS-eligible statuses, so riders can't raise SOS while the driver waits at pickup.
- **Fix:** send SOS SMS/calls synchronously (with retry) to each contact's own number, push an immediate `/admin` socket alert plus a page to an on-call channel, add `arrived` to the allowed statuses, and write an integration test that asserts the SMS recipient.

### P0-11 · Events are silently lost when Kafka is unavailable
- **Where:** `src/config/kafka.js:65-82` (`publishEvent` catches every error and returns `undefined`; `_producerFailed = true` at `:58` latches **forever**). `src/jobs/outbox-relay.job.js:61` (`deliver`) awaits `publishEvent`, which never throws, so outbox rows are marked `published` even when nothing was sent.
- **Impact:** if Kafka is down at boot, all notifications, audit logs, and socket bridge events are dropped for the life of the process, and the outbox, which exists to prevent exactly this, reports success.
- **Fix:** make `publishEvent` throw (keep a separate `publishEventBestEffort` for genuinely optional events), reconnect the producer with backoff instead of latching, and fail the readiness probe while the producer is down.

### P0-12 · Secrets committed to git history
- **Where:** `backend_v2/back.zip` (added in `ff618042`, also touched in `8eab075d`) contains a `.env` dated 2026-09-07. The repo has a GitHub remote. The zips are deleted in the working tree but remain in history.
- **Fix:** **rotate every credential** that was in that file (DB, JWT secrets, Razorpay/RazorpayX, Stripe, Firebase service account, Google Maps, `BANK_DETAILS_ENC_KEY`, which also means re-encrypting stored bank data), then purge with `git filter-repo` and force-push. Add `*.zip` to `.gitignore` and enable GitHub secret scanning and push protection.

### P0-13 · Tips are recorded as earnings, but the rider is never charged
- **Where:** `src/modules/ride/ride.service.js:898` (`tipDriver`). It increments `rides.tipMinor` and the `driver_earnings` net with **no payment collection**. The ledger post calls `getOrCreateAccount` (`:940`), **which doesn't exist** in `ledger.service.js`, so it throws and the error is swallowed.
- **Impact:** drivers see tips they'll never receive, and earnings reports are inflated.
- **Fix:** route tips through a real charge (saved card, online, or wallet debit) and only credit the driver after capture.

### P0-14 · Driver cancel leaves the ride stuck, with no re-matching
- **Where:** `ride.service.js:1271-1281` sets `status: 'searching', driverId: null` and returns `{ rematching: true }`, but never calls `startMatchingProcess`. The matching reconciliation job then expires it within about a minute, because `requestedAt` is old. It also violates the state machine (`accepted → searching` isn't allowed in `ride-state-machine.js`).
- **Fix:** re-dispatch (new dispatch job, exclude the cancelling driver), add the transition to the state machine, and track driver cancellation rate and penalties.

---

## 5. P1 — High priority (fix before public launch)

### Identity and access
- **P1-1 Long-lived access tokens with no revocation.** `JWT_EXPIRES_IN` defaults to `7d` (`config/env.js:28`; `.env.example` says 15m). Blocked or suspended users keep access until expiry, because `authenticate*` middleware only verifies the signature. **Fix:** 15-minute access tokens, a `tokenVersion`/blocked check (cached in Redis), and rotating refresh tokens with reuse detection.
- **P1-2 Legacy driver OTP path skips the blocked check and device scoping.** `auth.service.js:326` (`verifyDriverOtp`) issues tokens for blocked drivers. Remove `/auth/driver/send-otp` and `/auth/driver/verify-otp`, or make them call `driverMobileVerify`.
- **P1-3 Ambiguous phone matching across countries.** `auth.service.js:35` maps a 10-digit number to **both** `+91…` and `+1…` and takes whichever row comes back first. Store and accept only E.164, and require the country on login.
- **P1-4 OTPs and PII are logged.** `auth.service.js:255` logs `otp=…`; about 10 `console.log` lines in `src/` include phone or OTP, and `emailOtp.js:33` logs codes. The email OTP uses `Math.random` (`emailOtp.js:10`) and **no email is ever sent in production** (`emailOtp.js:36`), so driver email login is non-functional in prod.
- **P1-5 Driver refresh doesn't re-check device revocation or block state in the DB.** It relies only on the Redis key. Check `driver_devices.isRevoked` and `drivers.isBlocked` on refresh.
- **P1-6 No server-side RBAC for admins.** `authenticateAdmin` (`middleware/authenticate.js:51`) accepts both `admin` and `super_admin` for **every** admin route. The portal hides super-admin pages client-side only. Any ops admin can adjust wallets, trigger payouts, and edit fares, commissions, and taxes via the API. Admin login also has no lockout, MFA, or refresh token. **Fix:** a permission middleware (`requirePermission('wallet.adjust')`), maker-checker for wallet adjustments, payouts, and refunds above a threshold, TOTP MFA for admins, and a login rate limit per email and IP.

### Ride integrity and fraud
- **P1-7 No-show fee abuse.** `cancelNoShow` (`ride.service.js:771`) has no minimum wait (a driver can mark arrived and immediately claim no-show), no check that the driver is near pickup, a hard-coded fee of `max(5000, 50% of fare)` (`:785`, which ignores the configured `cancellationFeeMinor`), and a hard-coded 80/20 split. It credits `driver_earnings` as `available` without charging the rider. `markDriverArrived` (`:724`) has no geofence check either.
- **P1-8 Race conditions in ride transitions.** `cancelRideByRider`, `markDriverArrived`, `cancelNoShow`, `cancelRideByAdmin`, and the rating functions read, then update without `WHERE status = <expected>` or a row lock, so a rider cancel and a driver accept can both "succeed". `requestRide` (`:83`) isn't transactional and can create duplicate active rides. Rider cancellation fees are never charged (`cancellationFeeMinor` exists in fare config but is unused), and riders can't cancel at `arrived` (`:311`). **Fix:** a single `transitionRide(rideId, from[], to, patch)` helper that does a conditional update in a transaction and enforces `ride-state-machine.js`.
- **P1-9 Matching runs in memory, inside the API process.** `startMatchingProcess` (`matching/matching.service.js:89`) is fire-and-forget. A deploy or crash mid-search orphans the ride until reconciliation expires it. Move it to a BullMQ "dispatch" queue with one job per wave so it survives restarts and scales independently. The airport queue is a no-op (`:146`, log only).
- **P1-10 Ghost drivers and stale location.** On socket `transport error` / `ping timeout` (`sockets/index.js:258`) drivers stay online and in the H3 index, which has no TTL. Location updates aren't validated (no lat/lng bounds, client-supplied `recordedAt`, no speed or teleport check, no rate limit). Add a heartbeat TTL sweep, server timestamps, and spoofing heuristics.
- **P1-11 Rider can subscribe to any ride's room.** `ride:subscribe` (`sockets/index.js:284`) has no ownership check, so any rider token plus a rideId streams that ride's driver location, start OTP, and (today) the driver PII from P0-9. Rider tokens are trivial to get (P0-1).

### Platform and infrastructure
- **P1-12 Sensitive identity data stored in plaintext.** `drivers.aadhar_number` and `license_number` are plaintext. Bank data uses AES-GCM correctly (`utils/encryption.js`), so reuse it here, store only a masked or last-4 value for display, and restrict document access. Also `.env.example` says to generate a 16-byte **hex** key, but `encryption.js` requires 32 bytes **base64**. Fix the docs.
- **P1-13 Doesn't scale beyond one instance.**
  - Socket.IO has **no Redis adapter**, and the Kafka bridge runs as one consumer group (`ride-socket-bridge`). With two or more instances, each message is handled by one instance, which can only emit to its own sockets, so riders on other instances miss events.
  - Every boot `obliterate`s BullMQ queues (`jobs/index.js:20` and the others), wiping other instances' in-flight jobs during rolling deploys.
  - `redis.keys('*')` is used in `matching-reconciliation.service.js:81` and `matching-policy.service.js:139,157`. Use `SCAN`.
  - The rate limiter is registered before Redis connects (`plugins/index.js:63`), so it's **in-memory per instance**.
  - The DB pool is capped at 5 (`config/db.js:14`) for HTTP + sockets + workers + matching.
  - **Fix:** `@socket.io/redis-adapter`, a sticky-session load balancer, separate API and worker processes, idempotent job scheduling (`upsertJobScheduler`) instead of obliterate, and pool sizing based on load tests.
- **P1-14 No request validation anywhere.** There are zero Fastify JSON schemas (`zod` is a dependency but unused in the backend). Missing bodies cause 500s (`request.body.reason` on an empty body), types aren't enforced, and Swagger is empty. Public `POST /fare/estimate|estimate-all|quote` call Google Maps without auth, which invites billing abuse at 100 req/min per IP.
- **P1-15 Money operations aren't atomic.** `_markRidePaid` (`ride-payment.service.js`) updates `payments`, posts the ledger, updates `rides`, and upserts `driver_earnings` as separate statements. A failure midway leaves the system inconsistent. `completeRide` writes `driver_earnings.status = 'available'` for online rides before payment is captured (`ride.service.js:1057`). Earnings should be `pending` until capture.
- **P1-16 Silent commission fallback.** If commission resolution throws, the code silently uses 20% (or 5% for subscribers) in at least five places (e.g. `ride.service.js:1047`). Fail loudly and flag the ride for review instead.
- **P1-17 Referral and promo farming can be cashed out.** Referral rewards credit **withdrawable** rider wallets on the referee's first completed ride, including cash rides (`promo.service.js:321`). Combined with free account creation (P0-1) and rider wallet withdrawals (`wallet.service.js:394`), collusion turns promo money into cash. Promo usage limits are checked at quote time and incremented at completion (not atomic). **Fix:** make promotional credit a non-withdrawable balance type, add velocity, device, and payment fingerprint checks, and require an online-paid first ride.
- **P1-18 Cash and payment-method mismatch.** `recordCashCollection` (`ride-payment.service.js:169`) lets the driver mark a ride as cash-paid at `arrived`/`started`, and on rides whose selected method was a saved card, which skips the card charge. Restrict it to `completed` rides with `paymentMethod = cash`.
- **P1-19 Unsafe CORS and socket CORS.** The CORS origin callback returns `true` for every origin (`plugins/index.js:29,32`) with `credentials: true`, and socket CORS defaults to `*` (`sockets/index.js:76`). Use an explicit allow-list per environment.
- **P1-20 Unauthenticated dev file storage.** `PUT/GET /api/v1/dev-storage/*` is open whenever S3 isn't configured, which it isn't in the current `.env`, so anyone can write 10 MB files (disk fill) and read driver documents by key. Register it only in development and require auth. Separately, `createUploadUrl` signs `ContentLength = maxFileSizeMb` (`utils/storage.js:97`), which very likely forces every S3 upload to be exactly 10 MB, so normal uploads would fail. This is untested here because no bucket is configured; verify it against the real bucket. Use a presigned **POST** with a `content-length-range` condition.
- **P1-21 Crash handling keeps a broken process alive.** `uncaughtException` / `unhandledRejection` are logged and the process keeps running (`server.js:198`). Log, flush, and exit non-zero so the orchestrator restarts it.
- **P1-22 Health and metrics.** `/health` always returns OK and doesn't check DB, Redis, or Kafka (`server.js:140`). `/metrics` is public (`plugins/metrics.js:5`), and so is Swagger `/docs`. Add `/livez` and `/readyz`, and put metrics and docs behind auth or an internal network.

---

## 6. P2 — Medium priority (first month after launch)

1. **Duplicate events.** `RIDE_ACCEPTED`, `RIDE_STARTED`, and `RIDE_COMPLETED` are written to the outbox **and** published directly, so riders get duplicate notifications and socket events.
2. **Idempotency keys default to `Date.now()`** when the header is missing (`ride-payment.routes.js:14`, `pay-wallet`), which defeats idempotency. Require the header.
3. **Start OTP** uses `Math.random` and has no attempt limit (`ride.service.js:520`). Use `crypto.randomInt` and lock after 5 attempts.
4. **Currency defaults to `'USD'`** in many ride, tip, and receipt paths, and `formatMinorMoney` assumes 2 decimals. The platform is INR/CAD, so derive currency from the ride or country and fail when it's missing.
5. **Admin dashboard cost.** Each instance re-runs six heavy queries every 20s and on every admin connect (`sockets/index.js`). Cache the snapshot in Redis and have one worker compute it.
6. **Very verbose logging.** There are 123 `console.log` calls, including a full JSON dump of every candidate per matching wave (`candidate-filter.service.js`). Use the Fastify/pino logger with levels and redaction (`phone`, `otp`, `token`, `aadhar*`). Production level is `warn`, which hides useful info logs. Ship JSON logs to a log store and set up alerting.
7. **N+1 queries in matching filters.** There are two or three Redis/DB round trips per candidate (lock, active ride, cooldown, destination mode, reservation). Batch with `MGET` / one SQL query.
8. **Rating math.** `rateRider` uses `users.totalRides` as the rating count, and both rating paths are read-modify-write races. Store ratings in a table and compute aggregates.
9. **DB TLS.** `DB_SSL=true` sets `rejectUnauthorized: false` (`config/db.js:6`). Pin the provider's CA.
10. **Migration drift.** `scripts/patch-db-columns.js`, `create-support-tables.js`, `migrate-commercial-v2.js`, and `patch_backend_schema.js` alter the schema outside drizzle migrations. Fold them into migrations and make CI run `drizzle-kit check`.
11. **Dockerfile.** It runs as root, has no `HEALTHCHECK`, and `COPY . .` includes tests, docs, the `portal/*.html` dev pages, and `seed.js`. Use a multi-stage build, the `node` user, and Node 22 LTS. `docker-compose.yml` leaves Postgres and the API commented out; Kafka/Kafka-UI use `latest` tags and single-replica settings.
12. **Master-data DELETE.** `DELETE /geo/admin/cities/:id` exists while countries and states use enable/disable. This conflicts with the project rule of never hard-deleting master data. Replace it with disable.
13. **`markMessagesAsRead`** (`chat.service.js:104`) doesn't verify the reader belongs to the ride.
14. **Driver eligibility.** `goOnline` (`driver.service.js:714`) only checks `approvalStatus` and `isBlocked`. It doesn't check document validity, vehicle approval/inspection, or subscription/commission dues. Matching has the same gap. Decide the business rule and enforce it in both places.
15. **Ride status not cleared everywhere.** Reconciliation expiry doesn't write `ride_status_history` or signal the matching loop, and `requestRide`'s auto-expire of old `searching` rides doesn't stop their matching loops.
16. **Admin notifications for financial alerts.** Ledger mismatch and outbox dead-letter alerts go to Kafka audit only. Wire them to Slack, email, or PagerDuty.
17. **Tests hit the real `.env` DB.** Add a dedicated test DB (`.env.test`), run the suite in CI, and add integration tests for every P0 fix (payment replay, webhook forgery, payout concurrency, PII DTOs, SOS recipient).

---

## 7. Compliance and operations checklist

| Item | Status | Notes |
|---|---|---|
| Secrets in a secret manager, not `.env` files | ❌ | Rotate (P0-12); use AWS Secrets Manager, Doppler, or Vault |
| PII encryption at rest (Aadhaar, licence, DOB) | ❌ | P1-12 |
| PII minimisation in API/socket responses | ❌ | P0-9 |
| Data retention and deletion (DPDP / PIPEDA) | ❌ | No account deletion or export flow found; GPS pings and chat have no retention policy |
| Payment compliance | ⚠️ | Card data stays with Razorpay/Stripe (good). Webhook and verify hardening needed (P0-4/5/6) |
| Indian SMS DLT registration for OTP templates | ❌ | Required for Indian SMS delivery |
| Audit log durability | ❌ | Audit goes through lossy Kafka (P0-11); financial actions should write audit rows in the same DB transaction |
| Backups / PITR / restore drill | ❓ | Not in repo; must be set up on the managed Postgres |
| Monitoring and alerting | ⚠️ | `prom-client` metrics exist; no dashboards, alerts, or tracing; no error tracker (Sentry) |
| CI/CD | ❌ | No pipeline config in repo (lint, test, migration check, image build) |
| Load test (matching + sockets) | ❌ | Needed before launch; target peak concurrent drivers × location update rate |
| Separate environments (dev / staging / prod) | ⚠️ | `NODE_ENV` gates dev bypasses; staging must not use real money with bypasses (P0-6) |
| Licensing | ⚠️ | Portal uses CKEditor 5 with `licenseKey: "GPL"` (`RichTextEditor.tsx:34`), which isn't valid for a closed-source client product; buy a commercial licence or swap editors |

---

## 8. Admin portal review (`portal/`)

### 8.1 What exists (all routed and building)
Dashboard (KPIs, live map, dispatch queue, supply/demand, recent activity via `/admin` socket), Riders (list/detail/subscription panel), Drivers (list/detail/register wizard/subscription/bank details), Driver groups, Vehicle types, Vehicle models, Geo (countries, states, cities with hex modal and service-area drawer, currencies, city types, city-type fares), Zones (with H3 hex modal), Fare rules, Tax rules, Commission rules, Fare simulator, Promos, Subscriptions (plans, versions, group pricing, subscribers, pause/resume/cancel), Rider plans, Rides (list, admin cancel, offers, history, invoice), Dispatch ops (matching policies, weights, active jobs, debugger, airport), Ride payments, Wallets, Ledger, Refunds, Reconciliation (runs/mismatches), Payment disputes, Payouts (runs, accounts, instant payout), Cash management, FX rates, Flagged trips, SOS alerts, Lost items, Moderation, Notification templates, Onboarding config (document types, questions, translations, legal), Support (tickets, live chat, FAQ/categories), Audit logs and ride history.

### 8.2 Problems to fix

| # | Severity | Issue | Where | Fix |
|---|---|---|---|---|
| UI-1 | **P0** | "Simulate Stripe approval" calls the public mock endpoint (P0-3) | `features/bank-details/components/bank-details-panel.tsx:154` | Remove; show real Stripe onboarding status |
| UI-2 | **P1** | Role gating is client-side only, and the role is read from `localStorage` (editable) | `components/protected-route.tsx`, `config/navConfig.ts` (`roles: ["super_admin"]`), `routes/AppRoutes.tsx:145-195` | Keep UI gating but drive it from `/admin/me` permissions; backend must enforce (P1-6) |
| UI-3 | **P1** | Admin JWT stored in `localStorage` (readable by any XSS); no refresh flow, so the 7-day token persists | `lib/api.ts`, `features/auth/api.ts` | httpOnly, Secure, SameSite cookie session (or a short-lived token in memory plus an httpOnly refresh cookie); add CSP headers on the static host |
| UI-4 | **P1** | Hard-coded fallback keys in source: Google Maps API key, plus public Stripe/Razorpay **test** keys used when env vars are missing | `lib/google-maps.ts:10`, `constant/index.ts:26-27` | Remove fallbacks and fail the build if `VITE_*` keys are missing; restrict the Maps key by HTTP referrer in Google Cloud and rotate it, since it's in git |
| UI-5 | P2 | Dead API clients call backend endpoints that don't exist (`/fare/plans*`, `/fare/night-rules`, `/fare/peak-rules`, `/fare/surge-rules`, `/fare/toll-rules`, `/fare/airports`, `/fare/airport-rules`) | `features/fare-rules/api.ts:132-206` (`pricingPlansApi`, `pricingRulesAdminApi`, unused) | Delete, or build the backend endpoints if those features are planned |
| UI-6 | P2 | `PRIVATE_KEY: 'rideshare-admin-secret-key'` constant in client code (unused) | `constant/index.ts:23` | Remove; nothing secret belongs in a browser bundle |
| UI-7 | P2 | `dangerouslySetInnerHTML` for template previews | `features/notification-templates/components/dialog.tsx:220` | Sanitize with DOMPurify (admin-authored, but defence in depth) |
| UI-8 | P2 | `BackendResponse.PAGINATION` type (`total/page/limit`) doesn't match the backend (`totalItems/currentPage/itemsPerPage/totalPages`); it's papered over by `normalize-pagination.ts` | `lib/api-client.ts` | Fix the type; delete the shim |
| UI-9 | P2 | `ProtectedRoute` renders children before redirecting unauthenticated users, so protected queries fire and 401 | `components/protected-route.tsx` | Return the loader or `<Navigate>` when there's no user |
| UI-10 | P2 | 760 kB chunk (`list-*.js`); h3-js and zod chunks are large | build output | Lazy-load map, CKEditor, and h3 per route; `manualChunks` |
| UI-11 | P2 | 15 lint warnings (`exhaustive-deps`), which can cause stale closures in tables (promos, drivers, rides, cash, reconciliation, fare simulator, register wizard) | lint output | Fix deps / `useCallback` |
| UI-12 | P2 | 10s axios timeout with no retry/backoff on idempotent GETs; payment actions must send `Idempotency-Key` | `lib/api.ts` | Add an `Idempotency-Key` header for all money mutations (instant payout, refunds, wallet adjust) |
| UI-13 | P2 | Uncommitted wallet panel and checkout changes in the working tree | `features/wallets/*`, `components/payments/payment-checkout-modal.tsx` | Review and commit, or discard, before release |

### 8.3 Backend features with no portal UI (ops can't use them)

| Backend capability | Endpoints | Why it matters |
|---|---|---|
| **Rider wallet withdrawal approvals** | `GET /wallets/withdrawals`, `PATCH /wallets/withdrawals/:id/approve|reject` | Riders can request withdrawals but nobody can process them |
| **Ride disputes** (rider vs driver complaints) | `GET /ride-disputes`, `GET/PATCH /ride-disputes/:id` | Complaints pile up unhandled |
| **Financial audit** | `GET /financial-audit/audit/health`, `/financial-transactions` | Finance has no view of ledger health |
| **Notification history** | `GET /admin/notifications` | Support can't confirm what a user was sent |
| **Vehicle inspections** | `GET/POST /vehicles/admin/.../inspections`, activate vehicle | Can't record inspections before activating vehicles |
| Onboarding question reorder | `PATCH /onboarding/admin/questions/reorder` | Ordering must be done in the DB |
| Manual matching reconcile | `POST /matching/admin/reconcile` | Ops tool for stuck rides |
| **Driver incentive campaigns** | ⚠️ No admin API exists either (only driver `active/progress/claim`) | Campaigns can only be created by DB/seed; backend CRUD and portal UI both needed |
| Payment provider routing / circuit health | Tables exist (`payment_provider_routes`, `provider_health`), no admin API | PSP routing can't be configured without SQL |
| Commercial audit log | `commercial_audit_logs` table, no read API/UI | Pricing and commission change history isn't visible |

### 8.4 Portal changes that pair with backend fixes
- After P1-6: drive the sidebar and route guards from `/admin/me` `permissions`, and show a 403 page instead of silently redirecting.
- After P0-9: confirm the driver detail and ride pages still get what they need from the new DTOs (admins should still see full driver KYC; riders shouldn't).
- After P1-1: handle `401` with silent refresh, and log out on refresh failure.
- After P0-3: replace the payout account "approve" UX with a status view (`pending → submitted → verified/rejected` from webhooks) and an explicit, audited admin override if the business needs one.
- Add confirmation dialogs with typed reason and amount for wallet adjustments, instant payouts, refunds, and admin ride cancels, plus maker-checker approval screens once the backend supports them.

---

## 9. Recommended fix order

**Week 1 — stop the bleeding (all P0 security)**
1. Rotate all secrets and purge `back.zip`/`src.zip` from history (P0-12).
2. Real OTP generation plus per-IP limits (P0-1). Remove `socket-test`, `dev-storage`, and the mock payout approval from production builds (P0-2, P0-3, P1-20, UI-1).
3. Fail-closed gateways and webhook secrets required (P0-5, P0-6).
4. Bind payment verification to attempt, payer, ride or plan, and amount (P0-4, P0-7).
5. Driver/rider DTO allow-lists and room ownership checks (P0-9, P1-11).

**Week 2 — money correctness**
6. Payout reservation via the ledger (P0-8); earnings `pending` until capture (P1-15); a transactional `_markRidePaid`.
7. Real tip charging (P0-13); no-show and cancellation fee rules (P1-7); a cash-collection guard (P1-18).
8. A Kafka `publishEvent` that throws, with outbox correctness (P0-11); reliable SOS delivery (P0-10).

**Week 3 — ride lifecycle and auth hardening**
9. `transitionRide` helper with the state machine enforced (P1-8); driver-cancel re-dispatch (P0-14).
10. Short JWTs, blocked/version checks, refresh rotation, legacy OTP route removal, E.164 only (P1-1..5).
11. Admin RBAC, MFA, and maker-checker (P1-6, UI-2, UI-3).

**Week 4 — scale and operate**
12. Redis socket adapter, separate worker process, queue-based matching, `SCAN` instead of `KEYS`, Redis-backed rate limit, DB pool sizing (P1-9, P1-13).
13. JSON-schema validation on every route (P1-14); auth and caching on fare endpoints.
14. Health/readiness, metrics/docs behind auth, crash-exit, Sentry, dashboards, CI pipeline with a test DB (P1-21, P1-22, §7).
15. Load test, security re-test, then a staged launch in one city.

**Portal in parallel:** UI-1..4 in week 1–2; the missing ops screens (§8.3, withdrawals and ride disputes first) in weeks 2–4.

---

## 10. Second-pass review still needed

These modules were inventoried but not reviewed line by line. Review them with the same lens (auth/ownership, atomicity, fail-closed, amount binding) before launch:

- `refund` (gateway refund + ledger reversal + linked subscription/ride cancel)
- `dispute` (Razorpay dispute payload is explicitly unverified in code comments)
- `reconciliation` (job correctness against real gateway settlement reports)
- `payment-method` / `payment-region` / `saved-method-charge` (off-session charges, 3DS/action-required flow)
- `fare` engine stages 01–11, quotes and locking, `recalculation` and `finalize-trip` (the auto-charge on completion runs **before** GPS-based finalisation, so a later adjustment may not match the captured amount)
- `support` (attachments presign, agent authorization), `documents` (upload confirm, admin view URLs), `onboarding` condition engine
- `geo`, `zone`, `hex-zone` (precedence and overlapping zones), `subscription-lifecycle` (proration)

---

## Appendix A — Inventory numbers

| Item | Count |
|---|---|
| Backend REST routes (under `/api/v1`) | 488 |
| Backend source (src/) | ~33,800 lines JS |
| DB schema files | 113 (≈111 tables + enums + index) |
| Drizzle migrations | 48 |
| BullMQ queues | 13 (subscription-expiry, ride-timeout, gps-ping-flush, ledger-verification, reconciliation, payout-batch, outbox-relay, outbox-prune, scheduled-ride-dispatch, document-expiry, matching-reconciliation, support-jobs, webhook-processing) |
| Kafka topics / consumer groups | 24 topics / 4 groups |
| Socket.IO namespaces | `/`, `/test`, `/driver`, `/rider`, `/admin`, `/support` |
| Backend tests | 250 (247 pass, 3 fail, env-dependent) |
| Portal source | ~51,700 lines TS/TSX across 32 feature folders |

## Appendix B — Unauthenticated endpoints (review list)

Intended to be public: auth start/verify/refresh, rider region check, `GET /geo/*` lookups, `GET /vehicle-types`, `GET /vehicle-models`, `GET /zones`, `POST /zones/detect|resolve-hex`, subscription/rider plan listings, `GET /public/trips/:token`, `GET /tracking/public/:token`, payment/payout webhooks (signature-checked; see P0-5), `GET /fx/rate`, `POST /fx/convert`.

**Needs action:** `GET /socket-test/quick-auth` (P0-2), `GET /payout-accounts/stripe/onboarding-return` (P0-3), `PUT|GET /dev-storage/*` (P1-20), `POST /fare/estimate|estimate-all|quote` and `GET /fare/quote/:id` (P1-14), `GET /metrics`, `GET /docs` (P1-22), `GET /portal/*` dev pages, `GET /matching/airport/status`.
