# Driver App — Complete Flow Guide

Audience: the engineer building the **driver mobile app** (Flutter — no driver app exists in
`app/` yet, only the rider app; this can reuse its shell/patterns per
[driver-registration-design.md](driver-registration-design.md)).

This doc describes what is **actually implemented in `backend/` today**, verified against the
route/service files — not the original design proposal (some of that has since been built, but
field names, exact statuses, and a couple of endpoints differ from the proposal). Base URL for
every path below: `{API_BASE}/api/{API_VERSION}` (e.g. `http://localhost:3000/api/v1`).

Response envelope (every endpoint, see `utils/response.js`):
```json
// success (single)
{ "SUCCESS": true, "MESSAGE": <data> }
// success (list)
{ "SUCCESS": true, "MESSAGE": [...], "COUNT": 12, "PAGINATION": { "currentPage":1,"itemsPerPage":20,"totalItems":12,"totalPages":1 } }
// error
{ "SUCCESS": false, "MESSAGE": "..." }
```

---

## Part 1 — Driver Registration Flow

### 1.0 High-level state machine

`drivers.registrationStatus` drives the onboarding UI; `drivers.approvalStatus` and
`drivers.subscriptionStatus` are separate columns that only matter after registration is
submitted.

```
new
  → mobile_verified / email_verified   (OTP verified, driver row created)
  → registration_in_progress            (first profile-step write)
  → pending_review                      (POST /drivers/submit-application, all required fields complete)
      → [admin reviews]
      → approved   (drivers.approvalStatus = 'approved')
      → rejected   (drivers.approvalStatus = 'rejected', driver can edit & resubmit)
```

`drivers.registrationStep` (integer) tracks the **furthest completed step** so the app can resume
a partial registration after the driver closes the app:

| Step # | Meaning | Set by |
|---|---|---|
| 2 | Personal info | `PATCH /drivers/profile` |
| 3 | Legal (terms/privacy accepted) | `POST /onboarding/legal/accept` |
| 4 | Driving location | `PUT /drivers/driving-location` |
| 5 | Questionnaire | `POST /onboarding/answers` |
| 6 | Vehicle | `POST /vehicles` |
| 7 | Documents | `POST /documents/:documentTypeId` (confirm upload) |
| 8 | Profile photo | `POST /drivers/profile-photo` |
| 9 | Bank details | *(not yet implemented — see §1.9 gap)* |
| 10 | Emergency contact | *(not yet implemented — see §1.9 gap)* |
| 11 | Review | client-only screen |
| 12 | Submitted | `POST /drivers/submit-application` |

Steps can be completed **in any order** — `registrationStep` only ever moves forward (it's a
"furthest reached" watermark, not a strict gate), so don't assume the backend blocks
out-of-order writes. Order them sensibly in the UI anyway for a coherent UX.

### 1.1 Step 0 — App start / resume check

On every cold start where a token already exists:
```
GET /onboarding/state
→ { registrationStatus, registrationStep, pendingLegalAcceptance }
```
Deep-link straight to `registrationStep + 1`. If `pendingLegalAcceptance: true` (admin published
a new terms/privacy version since the driver last accepted), interrupt with the legal screen
before anything else, regardless of step.

If `registrationStatus` is already `pending_review`, `approved`, `rejected`, `suspended`, etc.,
skip the onboarding stack entirely and route to the appropriate status/home screen (§2).

### 1.2 Step 1 — Login / Signup (mobile or email, OTP)

**Mobile path:**
```
POST /auth/driver/mobile/start   { phone, deviceId }
POST /auth/driver/mobile/resend  { phone }
POST /auth/driver/mobile/verify  { phone, otp, deviceId, platform, fcmToken }
  → { accessToken, refreshToken, driver, registrationStatus, registrationStep }
```
**Email path** (same shape): `/auth/driver/email/start`, `/auth/driver/email/verify`.

Notes:
- `deviceId` must be a stable, client-generated fingerprint. Sessions are **device-scoped**
  (`driver_devices` table) — logging in on a second phone does not kill the first phone's
  session. `GET /auth/devices` lists active sessions, `DELETE /auth/devices/:deviceId` remotely
  logs one out (build this into a "manage devices" settings screen).
- In dev (no Twilio/email provider configured), OTPs are printed to the **backend console**, not
  actually sent — expected during local development, not a bug.
- Access tokens are short-lived; call `POST /auth/refresh { refreshToken }` on 401. `POST
  /auth/logout` revokes the current device's refresh token only.
- `POST /drivers/fcm-token` — call this after login and whenever the FCM token rotates, so push
  notifications (approval, rejection, ride offers) actually reach the device.

### 1.3 Step 2 — Personal info

```
PATCH /drivers/profile   { name, dateOfBirth, gender, referralCode, preferredLanguageCode }
```
All fields optional per-call (partial update) — but the completeness check (§1.8) currently only
requires `name`. Age/gender/referral are collected but not gate-checked server-side yet, so don't
rely on the backend to enforce "18+" — validate client-side if that's a legal requirement in your
markets, and flag this to backend if server-side enforcement is needed before launch.

### 1.4 Step 3 — Legal acceptance

```
GET  /onboarding/legal/:type?countryId=...      type = 'terms' | 'privacy_policy'
POST /onboarding/legal/accept   { legalDocumentId }
```
Fetch driving location's country **first** if you already have it (legal docs can be
country-specific with a global fallback when `countryId` is null on the document row). If the
driver hasn't picked a country yet, call without `countryId` to get the global default, and
re-prompt after location is set if a country-specific version exists and differs.

Every acceptance is immutable and timestamped server-side (IP + user-agent captured
automatically from the request) — nothing else for the client to send.

### 1.5 Step 4 — Driving location

```
GET /geo/countries                          (no auth required — public picker)
GET /geo/countries/:countryId/states
GET /geo/states/:stateId/cities
PUT /drivers/driving-location   { countryId, stateId, cityId }   (all three required)
```
Cascading picker — disable state until country is picked, city until state is picked. Only
`isActive: true` rows are returned. **Edge case**: if a driver picked a city that an admin later
disables, subsequent calls that resolve requirements from `cityId` (config, document
requirements) will simply stop matching that city's rules — there's no explicit
`CITY_INACTIVE` error thrown today, so don't build UI around expecting one; just re-fetch
`/onboarding/config` if location-dependent screens look empty.

### 1.6 Step 5 — Dynamic questionnaire

```
GET  /onboarding/questions?countryId=...&lang=en
POST /onboarding/answers   { answers: [{ questionId, value }, ...] }
GET  /onboarding/answers/mine
```
Questions are admin-authored and can be conditional (`dependsOn: { questionId, operator, value }`).
Client rendering algorithm:
1. Render top-level questions (no `dependsOn`) immediately.
2. Re-evaluate any question whose `dependsOn.questionId` was just answered; show/hide accordingly.
3. **Clear the stored answer for a question the moment it becomes hidden** — don't just hide the
   widget and leave stale state, or the batch submit will include an answer for a question that
   shouldn't be visible.
4. Submit only the currently-visible answers in one batch call. The server independently
   re-derives which questions should be visible/required from the submitted country — a stale or
   tampered client can't force-answer a hidden question or skip a required visible one.

### 1.7 Step 6 — Vehicle

```
GET    /vehicles/mine
POST   /vehicles     { vehicleTypeId, model, year, registrationNumber, brand?, color?, vin?, seats?, fuelType?, transmission? }
PATCH  /vehicles/:id
DELETE /vehicles/:id
```
`vehicleTypeId, model, year, registrationNumber` are required by the route itself (400 if
missing). A driver can register multiple vehicles (e.g. switching cars later); registration
completeness (§1.8) just requires **at least one active vehicle** — it doesn't pin to a specific
one, so switching a primary vehicle post-approval doesn't require re-review by design.

### 1.8 Step 7 — Documents

Two-step presigned-upload flow, **per document type, per side**:
```
GET  /documents/types                              → active document types (license, ID proof, etc.)
POST /documents/:documentTypeId/upload-url  { side: 'front'|'back'|'pdf', contentType }
  → { uploadUrl, key, expiresIn }
PUT  <uploadUrl>                                    → raw file bytes, direct to S3-compatible storage
POST /documents/:documentTypeId  { side, key, documentNumber?, expiryDate? }
  → 202 { status: 'pending' }   (confirms upload, advances registrationStep to 7)
GET  /documents/mine                                → driver's uploaded documents + status
```
Required document set is **not hardcoded** — it's resolved per driver from
`document_types` × `document_type_requirements` scoped by the driver's country/city/vehicle type
(`GET /onboarding/config` returns `documentRequirements` for the driver's current selections in
one shot — fetch this once on entering the documents step and render cards from it). This means
a new country can require a different document list with zero app changes — **don't hardcode
"License + ID proof" anywhere in the client.**

Document status after upload is always `pending` until an admin manually reviews it
(`approved`/`rejected`) — there's no automated approval today.

⚠️ **Known duplication — read before wiring this up**: there is a second, older endpoint,
`POST /drivers/documents { licenseNumber, licenseDoc, aadharNumber, aadharDoc, vehicleTypeId,
vehicleNumber, vehicleModel, vehiclePhoto }`, which writes directly to legacy flat columns on the
`drivers` table (pre-dates the `driver_documents`/`document_types` system). **Use the
`/documents/:documentTypeId` flow above, not this one** — the legacy endpoint doesn't feed
`getRequiredDocumentTypesFor`/registration completeness at all and will leave your document step
looking incomplete even after calling it. Flag this to backend for cleanup/removal rather than
building against it.

### 1.9 Step 8 — Profile photo

```
POST /drivers/profile-photo/upload-url   { contentType }
PUT  <uploadUrl>
POST /drivers/profile-photo              { key }
```

### 1.10 Steps 9–10 — Bank details / emergency contact — **not yet built**

The design doc describes these as optional steps with dedicated tables
(`driver_bank_accounts`, `driver_emergency_contacts`), but **no schema, service, or route exists
for either today** (`getRegistrationSummary` never checks for them). Two options:
- Ship registration without them for now (nothing blocks submission), add later — recommended,
  since they're explicitly optional/skippable in the design and not required for approval.
- Ask backend to implement them first if bank details are needed before drivers can receive
  payouts (see Part 2, §2.4 — payouts aren't implemented yet either, so this is likely fine to
  defer together).

### 1.11 Step 11 — Review screen

```
GET /drivers/registration-summary
→ { driver, vehicles, documents, answers, isComplete, missing: [...] }
```
`missing` is a list of tokens like `"name"`, `"drivingLocation"`, `"vehicle"`,
`"legalAcceptance"`, `"question:own_vehicle"`, `"document:DRIVERS_LICENSE"` — use it to drive
per-section "incomplete" badges on the review screen and deep-link `[Edit]` back to the right
step. Poll/refetch this after any edit rather than tracking completeness client-side, since the
required-document and required-question sets are server-config-driven and can change.

### 1.12 Step 12 — Submit

```
POST /drivers/submit-application
```
Server re-validates completeness independently (same check as §1.11) and returns
`422 INCOMPLETE_REQUIRED_FIELDS { missing: [...] }` if anything regressed between the review
screen load and submit (e.g. an admin disabled the driver's vehicle type mid-flow). On success,
`registrationStatus → pending_review`; show the "under review" status screen (§2.1).

### 1.13 Edge cases checklist

| Scenario | What actually happens | What the app must do |
|---|---|---|
| Driver closes app mid-registration | Nothing lost — every step writes immediately server-side | On resume, call `GET /onboarding/state` and deep-link to `registrationStep + 1`, don't keep local draft state as the source of truth |
| Driver logs in on a second device | Both sessions stay valid independently | Optionally surface `/auth/devices` as a "logged in elsewhere" notice |
| Admin publishes a new terms/privacy version after driver already accepted | `pendingLegalAcceptance: true` on next `/onboarding/state` call | Interrupt any screen with a re-acceptance modal before letting the driver continue |
| Admin disables the driver's previously-picked city/country | No explicit error; requirement lookups just stop returning matches for it | Re-fetch `/onboarding/config` if a location-dependent screen (documents, questionnaire) looks unexpectedly empty; prompt re-selecting location |
| Admin rejects the application | `approvalStatus = 'rejected'`, `registrationStatus` stays queryable via `/drivers/profile` | Show rejection reason (from `POST /admin/drivers/:id/reject { note }`, surfaced via push + should be readable from `/drivers/profile`), let driver edit any step and re-submit |
| Admin asks for more documents post-review | `POST /admin/drivers/:id/request-documents` sets status back toward `documents_pending` and lists specific `documentTypeCodes` | Show only the requested document cards, not the full document step over again |
| OTP wrong 5+ times / resend too soon | Standard rate-limit errors from `@fastify/rate-limit` + OTP module (`utils/otp.js`) | Surface cooldown/attempts-left from the response, disable resend button accordingly |
| Conditional question hidden after being answered | Stale answer must not be submitted | Clear local state for the question the instant its visibility condition becomes false |
| Network drop mid file-upload | Presigned URL has a TTL (`expiresIn`) | If the `PUT` to S3 fails or the URL expires, re-request a fresh `upload-url` — don't retry the same signed URL past its TTL |
| Driver has zero vehicles but multiple in the future | Only "at least one active `isActive: true` vehicle" is checked | Let drivers add/edit/soft-remove vehicles anytime, including post-approval, without re-triggering review |

---

## Part 2 — After Registration: Full Driver App Overview

Registration ending in `approved` does **not** by itself let a driver take rides — two more
gates apply, enforced server-side in `goOnline()`:

```js
if (driver.isBlocked)                       → 403 "Account is blocked"
if (driver.approvalStatus !== 'approved')   → 403 "Account not approved yet"
if (driver.subscriptionStatus !== 'active') → 403 "No active subscription"
```

So the real post-registration sequence is: **submit → wait for approval → buy a subscription →
go online → receive/serve rides.** This platform is subscription-based (drivers pay a
recurring fee for the right to take rides), not commission-based — there is no per-ride cut
taken by the platform.

### 2.1 Status screen (while `pending_review` / `under_verification`)

Poll or push-notify on `DRIVER_STATUS_CHANGED`/approval events; show a simple "Under review"
state with a support contact option. No polling interval is enforced server-side — a reasonable
client-side poll (e.g. on app foreground) plus a push notification on the actual approve/reject
event is the right combination, since approval is a manual admin action with no SLA.

### 2.2 Subscription purchase (gate before going online)

```
GET  /subscriptions/plans?countryId=...           → active plans for the driver's country
POST /subscriptions/initiate   { planId }          → creates a Razorpay/Stripe order
POST /subscriptions/verify     { planId, orderRef, paymentRef, signature }
                                                     → activates subscription on signature match
GET  /subscriptions/mine                            → current subscription status/expiry
GET  /subscriptions/history                         → past subscriptions
```
Payment webhooks (`/subscriptions/webhook/razorpay`, `/subscriptions/webhook/stripe`) are
server-to-server; the client only needs `initiate` → run the gateway's native checkout SDK
→ `verify`. A BullMQ job (`expireOverdueSubscriptions`) auto-lapses expired subscriptions —
build a "subscription expiring soon" banner in the driver home screen and re-run this same
purchase flow to renew (there's no separate "renew" endpoint, just buy again).

### 2.3 Going online & the ride loop

**Two parallel channels exist — use both:**
- REST: `POST /drivers/go-online { lat, lng }`, `POST /drivers/go-offline`,
  `POST /drivers/location { lat, lng }` (periodic pings).
- Socket.IO `/driver` namespace (real-time): connect authenticated, then emit
  `go_online`/`go_offline`/`location_update` for lower-latency location streaming, and listen for
  ride offers pushed to the socket in real time.

Ride lifecycle from the driver's side:
```
(ride offered — matched via expanding-radius search, see matching.service.js)
GET  /rides/driver/offers          → pending offers for this driver
POST /rides/:id/accept             (or socket event 'ride:accept' → 'ride:accept_ok'/'ride:accept_error')
POST /rides/:id/decline            (or socket event 'ride:decline' → 'ride:decline_ok')
POST /rides/:id/arriving           → notify rider driver is close
POST /rides/:id/start               → trip begins
POST /rides/:id/complete           → trip ends, triggers fare finalization
POST /rides/:id/driver-cancel       → driver-initiated cancellation (post-accept)
GET  /rides/driver/active          → currently active ride, if any (for app-resume/crash recovery)
```
**Offer expiry / decline is real**: ride offers go through the matching service's
expanding-radius ring search (5km → 10km → 15km, ~25s per ring); a driver who doesn't
accept/decline within that ring's window is simply skipped for that ride and it moves to the
next ring/driver — no explicit "offer expired" push is guaranteed, so the UI should have its own
local countdown timer per offer and auto-clear it rather than waiting on a server event.

### 2.4 Ongoing driver-app surface (beyond the ride loop)

- **Profile / vehicle management**: `GET/PATCH /drivers/profile`, `GET/POST/PATCH/DELETE
  /vehicles`, `PUT /drivers/driving-location`, `POST /drivers/profile-photo(-url)` — all usable
  post-approval for routine edits, none of them re-trigger review.
- **Document re-upload on expiry/rejection**: same `/documents/:documentTypeId` flow as
  registration; `GET /documents/mine` to show status/expiry per document so the driver can
  proactively renew before an admin has to chase them.
- **Device/session management**: `GET/DELETE /auth/devices/:deviceId` — surface as a security
  settings screen.
- **Ratings**: riders rate via `POST /rides/:id/rate` (rider-side); reflected on
  `drivers.rating`/`totalRatings`, readable from `GET /drivers/profile`.
- **Earnings/payouts**: **not implemented yet** — no payout/earnings endpoints exist in the
  backend today beyond subscription payment history (`GET /subscriptions/history`,
  `GET /subscriptions/admin/drivers/:driverId/payments` for admins). If the driver app needs an
  earnings screen, that's a backend gap to raise, not something to build against speculatively.
- **Blocking**: `admins` can `POST /drivers/:id/block` / `/unblock`; a blocked driver gets a 403
  on `go-online` — surface `isBlocked` clearly (distinct copy from "not approved" / "no
  subscription") so drivers know which of the three gates is failing.

### 2.5 What's explicitly out of scope / not yet built

Be aware of these gaps so the mobile team doesn't build screens against endpoints that don't
exist:
- Bank details & emergency contact (§1.10)
- Driver earnings/payout history and payout initiation
- Automated document verification (OCR, fraud checks) — every document is manually reviewed by
  an admin today
- In-app chat/call with rider (check `ride`/`notification` modules if this becomes a requirement
  — not present as of this doc)

---

## Quick reference — full endpoint map (driver-facing)

```
Auth            POST /auth/driver/mobile/start|resend|verify
                POST /auth/driver/email/start|verify
                GET  /auth/devices          DELETE /auth/devices/:deviceId
                POST /auth/refresh          POST /auth/logout

Onboarding      GET  /onboarding/config     GET /onboarding/state
                GET  /onboarding/questions  POST /onboarding/answers   GET /onboarding/answers/mine
                GET  /onboarding/legal/:type   POST /onboarding/legal/accept

Profile         GET/PATCH /drivers/profile
                PUT  /drivers/driving-location
                POST /drivers/profile-photo/upload-url  POST /drivers/profile-photo
                PATCH /drivers/fcm-token

Vehicle         GET/POST /vehicles          PATCH/DELETE /vehicles/:id

Documents       GET /documents/types        GET /documents/mine
                POST /documents/:typeId/upload-url   POST /documents/:typeId

Registration    GET  /drivers/registration-summary
                POST /drivers/submit-application

Subscription    GET  /subscriptions/plans
                POST /subscriptions/initiate   POST /subscriptions/verify
                GET  /subscriptions/mine        GET /subscriptions/history

Driver status   POST /drivers/go-online     POST /drivers/go-offline
                POST /drivers/location
                Socket.IO /driver: go_online, go_offline, location_update, ride:accept, ride:decline

Rides           GET  /rides/driver/offers   GET /rides/driver/active
                POST /rides/:id/accept|decline|arriving|start|complete|driver-cancel
```
