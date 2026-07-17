# `ride_share_driver` — Gap Analysis

Reviewed against the backend's actual implemented API (see
`backend/docs/driver-app-flow-guide.md`). Scope: everything currently in `lib/`. The
registration wizard itself is well-built and mostly wired correctly — the gaps below are what's
missing or faked, not a rewrite request.

## 1. Session / Auth

- **RESOLVED** — Session now restores on cold start (`CheckAuthStatus` checks `SecureStorage`,
  validates via `GET /drivers/profile`, clears + falls back to `Unauthenticated` on failure).
  `deviceId` is now a real per-install UUID (`services/device_id_service.dart`), resolved
  internally by the data layer — no longer a parameter anywhere in the presentation layer. The
  `auth` feature was also moved to `lib/features/auth/{data,domain,presentation}/` and a latent
  token-refresh bug was fixed along the way (the interceptor was reading fields
  `POST /auth/refresh` never actually returns). See `lib/features/auth/` and
  `lib/core/network/interceptors/auth_interceptor.dart`.
- **Two OTP code paths are conflated via an `isLogin` bool** — `startPhoneAuth`/`verifyPhoneOtp`
  switch between the device-scoped `/auth/driver/mobile/start|verify` (registration) and the
  legacy, non-device-scoped `/auth/driver/send-otp|verify-otp` (returning-driver "login") endpoints.
  Returning drivers never pass `deviceId` on the actual request in the `isLogin` branch, so their
  sessions aren't tracked in `driver_devices` at all. Worth confirming with backend whether
  returning-driver login should also go through the mobile/start|verify device-scoped path instead.
- **No email login/signup UI** — `POST /auth/driver/email/start` / `/email/verify` exist on the
  backend and are unused; only phone OTP is wired.
- **`POST /drivers/fcm-token` is never called.** No FCM token is captured or sent anywhere in the
  app (and no `firebase_messaging`/push dependency is in `pubspec.yaml` at all), so the driver
  will never receive push notifications for approval/rejection/document-request/ride-offer events
  that the backend publishes via Kafka → notification service.
- **`GET /auth/devices` / `DELETE /auth/devices/:deviceId`** (manage-sessions screen) — not built.

## 2. Registration / Onboarding wizard

- **RESOLVED** — `TermsLegalScreen` now fetches and renders the real `contentUrl` HTML for both
  documents (via `flutter_html`, using `_config.termsUrl`/`privacyPolicyUrl` already returned by
  `/onboarding/config`) instead of a hardcoded placeholder blob, with loading/error/retry states.
  The fetch uses a bare `Dio()` in the datasource, not the authenticated `ApiClient`, so the
  backend bearer token isn't sent to the external CDN host. `GET /onboarding/state` is now also
  polled once after config load (`OnboardingBloc.LoadOnboardingProgress`) and forces the driver
  back to the legal step if `pendingLegalAcceptance` is true. Note: this re-check only fires for
  drivers currently routed through the onboarding wizard (i.e. not yet `approved`/`active`) — an
  already-approved driver on the dashboard has no equivalent hook yet, since the dashboard is
  still 100% mock (see §3).
- **Bank details & emergency contact are entirely fake.** `BankDetailsScreen` /
  `EmergencyContactScreen` save into local `State` fields (`_bankHolder`, `_emergencyName`, etc.)
  and mark the item done via a client-only `_simulatedCompletedItems` set
  (`onboarding_wizard.dart:52-61, 845-877`) — nothing is ever sent to the backend. This matches a
  real backend gap too (no `driver_bank_accounts`/`driver_emergency_contacts` tables/endpoints
  exist yet, see `backend/docs/driver-app-flow-guide.md` §1.10), so this can't be fully fixed
  frontend-only — flag it to backend if bank payout details are needed before drivers can be paid
  out, otherwise it's reasonable to leave as a soft/no-op skip for now, but the fake "completed"
  checkmark is misleading and should either be removed or clearly labeled "saved on this device
  only, not yet submitted."
- **"I need a vehicle" (rental) path fabricates data**, not a real request. Choosing "No vehicle,
  interested in rental" (`onboarding_wizard.dart:620-666`) auto-submits a placeholder vehicle
  (`model: 'Rental (Requested)'`, fake registration number) and uploads two 8-byte fake PNGs as
  `VEHICLE_REGISTRATION`/`INSURANCE_CERTIFICATE` documents just to satisfy the completeness check,
  then lets the driver submit the full application as if they own a real, documented vehicle.
  There's no backend concept of a rental request (design doc mentions a "rental interest"
  questionnaire *answer*, not an actual workflow) — this needs a real backend flow (a rental
  request status, admin-assigned vehicle, etc.) before it can be done honestly; right now an admin
  reviewing this application will see garbage document images and a nonsense registration number.
- **RESOLVED** — Persistent status screen + real rejection reason. New `RegistrationStatusScreen`
  (`presentation/screens/onboarding/registration_status_screen.dart`) now covers
  `pending_review`/`under_verification`/`suspended`/`rejected`, checked at the top of
  `OnboardingWizard`'s builder against the live `AuthBloc` state — so it persists across app
  restarts, not just right after submit, and covers `pending_review` (previously unhandled at
  all — a driver would've been dropped back into a checklist that looked "complete" with a live
  Submit button). Replaced the old one-shot `AlertDialog` that forced an immediate logout on
  dismiss even for `rejected`, where the backend's own state machine
  (`rejected → registration_in_progress: driver edits & resubmits`) says the driver should be able
  to go back in and fix something instead. **Correction to my own note below**: I'd written that
  showing the rejection reason "needs a small backend addition" — that was wrong. Re-checked
  `driver.service.js`: `rejectDriver` already writes the admin's note to `drivers.approvalNote`,
  and `getProfile` (backing `GET /drivers/profile`) already returns it (the route strips only
  `aadharNumber`). No backend change was needed — `approvalNote` was just never read on the
  client; added it to `DriverProfile` and it's displayed as-is now.
  Not addressed here: `documents_pending` still free-flows into the normal wizard/checklist,
  unchanged — that's arguably correct already (the checklist screen shows per-document status and
  lets the driver re-upload), and the backend has no endpoint exposing *which* documents an admin
  requested beyond a push-notification's transient text, so a more specific screen isn't honestly
  buildable without a backend change.
- **`pendingLegalAcceptance` from `GET /onboarding/state` is never checked.** The app only calls
  `/onboarding/config` (which embeds the currently-active legal docs) but never calls
  `/onboarding/state` at all — so a driver who already accepted terms won't be re-prompted if an
  admin publishes a newer version after approval. There is currently no `/onboarding/state` call
  anywhere in `onboarding_remote_datasource.dart`.
- **`preferredLanguageCode` isn't synced to the backend.** The in-app language switch
  (`main.dart:51-56`) only writes to local `SecureStorage`; it's never sent via
  `PATCH /drivers/profile`, so server-rendered content (translated questions/documents) will keep
  using whatever the driver's server-side default is instead of their actual in-app language choice.
- **Resend OTP has no visible cooldown/attempts-left UI** — worth checking
  `otp_verification_screen.dart` against the backend's rate-limit response fields
  (`resendAfterSeconds`, attempts-left) so the resend button disables appropriately instead of
  allowing spam taps into a 429.
- **`GET /vehicles/mine` isn't used to check for existing vehicles before "Vehicle Selection"** —
  `VehicleSelectionScreen` is shown unconditionally rather than skipping straight to "you already
  have vehicle X" for a returning driver who's already added one.

## 3. Post-registration: nothing exists yet

Per the backend guide, `approved` status is only one of three gates before a driver can go
online (`approved` + active subscription + not blocked). **None of the following exist in this
app at all:**

- **RESOLVED** — Subscription purchase screen. New `features/subscription/{data,domain,presentation}`
  feature: `GET /subscriptions/plans`, `POST /subscriptions/initiate`, `POST /subscriptions/verify`
  all wired through a `SubscriptionRepository`/`SubscriptionBloc`. Handles all three response
  shapes `initiate` can return (confirmed against `subscription.service.js`): dev-mode
  auto-activation (no gateway keys configured), Razorpay checkout, and Stripe checkout — both
  native SDKs (`razorpay_flutter`, `flutter_stripe`) are wired for real checkout, not just one
  with the other stubbed. Router (`app_router.dart`) now gates `/dashboard` behind
  `driver.hasActiveSubscription`, redirecting to a new `/subscription` route otherwise — this
  gate didn't exist before at all. `DriverProfile` gained a `subscriptionStatus` field to support
  this. One caveat: Razorpay's native checkout needs the amount in minor units (paise), but
  `/subscriptions/initiate` only returns the display-formatted major-unit amount — reconstructed
  client-side as `round(amount * 100)`, which is exact for every currency this backend currently
  supports (confirmed 2-decimal-only in `utils/money.js`) but would need a real `amountMinor`
  field added server-side if a 0- or 3-decimal currency gateway is ever introduced. Also:
  this was implemented and statically analyzed (`flutter analyze` clean) but **not build- or
  device-tested** — I don't have a way to exercise a real Razorpay/Stripe checkout flow or
  confirm the native Android/iOS build succeeds from this environment (Windows, no iOS
  toolchain). Treat the payment SDK wiring as reviewed-but-unverified until someone runs it on
  a real device.
- **RESOLVED** — Real ride loop + Socket.IO. New `features/ride/{data,domain,presentation}`.
  Confirmed against `backend/src/sockets/index.js` and `backend/src/kafka/consumers/index.js`
  that ride offers arrive *only* via the `/driver` Socket.IO namespace's `ride:new_request` event
  (no REST poll-for-offer endpoint exists) — `RideSocketDataSource` connects there (auth via raw
  JWT in the handshake, matching the backend's `socket.handshake.auth.token` check, not a
  `Bearer` header), and `RideBloc` drives a state machine: idle → offer pending (with a local
  countdown, since the backend doesn't push an explicit "offer expired" event) → accepting →
  active (`ride.status` — accepted/arriving/started — drives one `ActiveRideScreen`'s primary
  action, mirroring how the backend itself models the lifecycle) → completed. Accept/decline go
  over the socket (`ride:accept`/`ride:decline`, matching the backend's own "socket shortcut"
  comment); arriving/start/complete/driver-cancel go over REST (no socket equivalents exist for
  those). Also wired the periodic `location_update` socket emit using the `LocationService`
  built for the go-online fix above — without it the rider-side tracking the backend expects
  never receives a position at all. The ride socket connects/disconnects with the
  `DriverStatusBloc` online/offline toggle in `driver_dashboard.dart`.
  **Known gaps, stated rather than silently dropped:**
  - No screen for `GET /rides/driver/offers` (past-offer history/inbox) — only live, in-the-moment
    offers via the socket are handled.
  - The active-ride screen shows no rider name/phone — confirmed that `acceptRide`/
    `getDriverActiveRide` in `ride.service.js` return the flat `rides` row with no rider join at
    all, so there's nothing to display; would need a backend change.
  - Toggling offline mid-ride (via the dashboard switch) disconnects the ride socket but doesn't
    block the toggle or cancel the ride server-side — the ride continues via REST regardless, just
    without live location streaming meanwhile. A real driver app would disable the toggle during
    an active trip; not done here.
  - Not build- or device-tested, same caveat as the subscription gateways above — `flutter
    analyze` clean, but no way to exercise a live socket connection against the running backend
    from this environment.
- **RESOLVED** — Real GPS + honest go-online/go-offline. `LocationService`
  (`lib/services/location_service.dart`) wraps `geolocator` (permission check/request, service-enabled
  check, real `getCurrentPosition()`); a new `features/dashboard` data/domain/presentation layer
  (`DriverStatusRepository`/`DriverStatusBloc`) replaced the raw `di.sl<ApiClient>().dio.post(...)`
  call that used to live directly in the widget. The switch now only shows **ONLINE** after the
  backend actually confirms it, reverts on failure, and shows the real error (not approved / no
  subscription / blocked / permission denied) via a toast instead of swallowing it. Added
  `NSLocationWhenInUseUsageDescription` to `ios/Runner/Info.plist` (required for the iOS
  permission prompt to work at all — Android needs no manifest change since `geolocator_android`'s
  own manifest merges in automatically). `google_maps_flutter` remains unused (no map view was
  in scope for this fix — only real coordinates for the existing go-online call).
- **Driver Dashboard is still mostly mock data.** `_todayEarnings`, `_todayTrips`, `_onlineHours`,
  the "4.88 ★" rating, the drawer's hardcoded name `"Arijit Bose"`/"Partner Driver", and the whole
  weekly-performance bar chart are all still literals — nothing is fetched from `GET /drivers/profile`
  or any ride-history endpoint. There is no earnings/payout endpoint on the backend yet either
  (flagged in the backend guide, §2.4/§2.5), so this can only be partially fixed today (real
  name/rating from `/drivers/profile` are available now; earnings/trips need a backend endpoint
  first). Online/offline status itself is no longer mock — see RESOLVED item above.

## 4. Ongoing driver-app surface (post-approval routine use)

None of these exist yet, all backed by already-implemented backend endpoints:

- Editable profile screen (`PATCH /drivers/profile`, change driving location, change vehicle) —
  currently these fields are only ever set once during onboarding; there's no "Settings/Profile"
  screen to revisit them afterward.
- Document status/renewal screen using `GET /documents/mine` — a driver can't see which document
  is `rejected`/`expired` or re-upload it outside the original onboarding flow (the entity
  `DriverDocument` already models `status`/`rejectionReason`, it's just never surfaced in a
  standalone screen).
- Vehicle management (`PATCH`/`DELETE /vehicles/:id`) — add/edit/retire a vehicle post-approval.
- Device/session management screen (`GET/DELETE /auth/devices`).
- Ratings history / ride history screen.
- Payout/earnings history (blocked on backend — not implemented server-side yet either).

## 5. Infra / packaging

- No `firebase_messaging`, `socket_io_client`, `device_info_plus`, or payment-gateway (Razorpay/
  Stripe) packages in `pubspec.yaml` — needed for §1 and §3 above.
- `geolocator` and `google_maps_flutter` are present in `pubspec.yaml` but completely unused —
  either wire them up (needed for real location + any in-app map/tracking view) or drop them to
  stop carrying the native permission/build footprint for nothing.
- `test/` only contains the default Flutter counter widget test (`test/widget_test.dart`) — no
  test coverage for the auth/onboarding blocs, repositories, or the wizard's step-navigation logic
  despite `bloc_test` being a listed dev dependency.

## Suggested priority order

1. **DONE** — Session restore on cold start + real `deviceId` (§1) — everything else depends on a
   driver staying logged in correctly.
2. **DONE** — Fix `go-online`/`go-offline` error handling + wire real GPS via `geolocator` (§3) —
   otherwise the app is misleading about whether a driver is actually reachable.
3. **DONE** — Legal document content display before accept (§2) — compliance risk, cheap to fix.
4. **DONE** — Subscription purchase flow (§3) — hard blocker; without it no driver can ever go
   online for real once approved.
5. **DONE** — Ride loop + Socket.IO (§3) — the actual core "driver app" functionality; everything
   above is just the funnel into this.
6. **DONE** — Persistent "under review" status screen + rejection-reason display (§2).
7. Dashboard real data, profile/vehicle/document management screens (§3, §4). — NOT STARTED
8. Bank details / emergency contact / rental-vehicle flow — depends on backend building the
   missing tables/endpoints first (see `backend/docs/driver-app-flow-guide.md` §1.10, §2.5). —
   NOT STARTED
