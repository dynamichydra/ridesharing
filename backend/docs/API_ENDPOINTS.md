# RideShare API — Endpoint Reference

Quick reference for app (Flutter) and web (portal) developers integrating with the backend.
For request/response *shapes* in more detail, use the live Swagger UI at `/docs` or the Postman
collection (`backend/RideShare-API.postman_collection.json`) — this file is for finding the right
endpoint fast and knowing who's allowed to call it.

## Conventions

- **Base URL**: `http://localhost:3000/api/v1` in dev (`{API_VERSION}` from `.env`, default `v1`).
- **Auth header**: `Authorization: Bearer <accessToken>` on every non-Public endpoint below.
- **Response envelope**:
  - Single object/action → `{ "SUCCESS": true, "MESSAGE": <data> }`
  - List → `{ "SUCCESS": true, "MESSAGE": [...], "COUNT": n, "PAGINATION": { currentPage, itemsPerPage, totalItems, totalPages } }`
  - Error → `{ "SUCCESS": false, "MESSAGE": "reason" }`
- **Pagination params** (list endpoints): `?page=1&limit=20` (limit capped at 100).
- **Auth column values**: `Public` (no token), `Rider`/`Driver`/`Admin` (role-specific JWT),
  `Any` (any valid JWT).

## Table of contents

- [Auth](#auth)
- [Driver — profile & registration](#driver--profile--registration)
- [Driver Vehicles](#driver-vehicles)
- [Documents](#documents)
- [Onboarding (dynamic questionnaire, legal docs, config)](#onboarding)
- [Geo (countries / states / cities)](#geo)
- [Rider](#rider)
- [Vehicle Types](#vehicle-types)
- [Zones](#zones)
- [Fare](#fare)
- [Rides](#rides)
- [Tracking](#tracking)
- [Subscriptions](#subscriptions)
- [Admin — platform stats](#admin--platform-stats)

---

## Auth

Base path: `/auth`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/driver/mobile/start` | Public | `{ phone, deviceId }` | Send OTP to a driver's phone; tells you whether this is a new account. |
| POST | `/driver/mobile/resend` | Public | `{ phone }` | Resend the OTP (rate-limited: 30s cooldown, 5/hour). |
| POST | `/driver/mobile/verify` | Public | `{ phone, otp, deviceId, platform?, fcmToken? }` | Verify OTP → creates the driver if new, returns access/refresh tokens + registration status/step. |
| POST | `/driver/email/start` | Public | `{ email }` | Send a verification code to a driver's email (alternative to phone signup). |
| POST | `/driver/email/verify` | Public | `{ email, code, deviceId, platform?, fcmToken? }` | Verify email code → creates/logs in the driver, returns tokens. |
| GET | `/devices` | Driver | — | List this driver's active logged-in devices/sessions. |
| DELETE | `/devices/:deviceId` | Driver | — | Remote-logout a specific device (e.g. "log out other sessions"). |
| POST | `/rider/send-otp` | Public | `{ phone }` | Send OTP to a rider's phone. |
| POST | `/rider/verify-otp` | Public | `{ phone, otp }` | Verify OTP → creates/logs in the rider, returns tokens. |
| POST | `/driver/send-otp` | Public | `{ phone }` | **Legacy** driver OTP send — kept for backward compatibility, prefer `/driver/mobile/start`. |
| POST | `/driver/verify-otp` | Public | `{ phone, otp }` | **Legacy** driver OTP verify — prefer `/driver/mobile/verify` (no device tracking). |
| POST | `/refresh` | Public | `{ refreshToken }` | Exchange a refresh token for a new access token. |
| POST | `/logout` | Any | `{ deviceId? }` | Revoke the refresh token for this session/device. |
| POST | `/admin/login` | Public | `{ email, password }` | Admin email+password login → access token. |

## Driver — profile & registration

Base path: `/drivers`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/profile` | Driver | — | Get the logged-in driver's own profile. |
| PATCH | `/profile` | Driver | `{ name?, email?, vehicleNumber?, vehicleModel?, vehicleYear?, fcmToken?, dateOfBirth?, gender?, referralCode?, preferredLanguageCode?, profilePhoto? }` | Update personal info / basic profile fields (registration Step 2). |
| PUT | `/driving-location` | Driver | `{ countryId, stateId, cityId }` | Set where the driver wants to drive (registration Step 4); validates the city is active and belongs to that state/country. |
| POST | `/profile-photo/upload-url` | Driver | `{ contentType }` | Get a presigned S3 URL to upload a profile photo. |
| POST | `/profile-photo` | Driver | `{ key }` | Confirm the profile photo upload completed. |
| GET | `/registration-summary` | Driver | — | Full aggregated view (profile, vehicle, documents, answers) + what's still missing — powers the review screen. |
| POST | `/submit-application` | Driver | — | Submit the completed application → status becomes `pending_review`. Fails with the list of missing items if incomplete. |
| POST | `/documents` | Driver | `{ licenseNumber, licenseDoc, aadharNumber, aadharDoc, vehicleTypeId, vehicleNumber, vehicleModel, vehiclePhoto }` | **Legacy** single-shot document submission — prefer the [Documents](#documents) module. |
| POST | `/go-online` | Driver | `{ lat, lng }` | Go online (requires approved + active subscription + not blocked). |
| POST | `/go-offline` | Driver | — | Go offline. |
| POST | `/location` | Driver | `{ lat, lng }` | Push a live GPS update (call every ~4s while online). |
| PATCH | `/fcm-token` | Driver | `{ fcmToken }` | Update push-notification token. |
| GET | `/` | Admin | — | List drivers. Filters: `?approvalStatus=&subscriptionStatus=&registrationStatus=&countryId=&cityId=&isBlocked=`. |
| GET | `/:id` | Admin | — | Full driver detail — same aggregated view as `/registration-summary`, for the review screen. |
| POST | `/:id/approve` | Admin | `{ note? }` | Approve a driver's application. |
| POST | `/:id/reject` | Admin | `{ note }` (required) | Reject a driver's application. |
| POST | `/:id/request-documents` | Admin | `{ documentTypeCodes: [...], note? }` | Ask the driver to (re-)upload specific documents; moves status back to `documents_pending`. |
| POST | `/:id/block` | Admin | — | Block/suspend a driver (forces offline). |
| POST | `/:id/unblock` | Admin | — | Unblock a driver. |

## Driver Vehicles

Base path: `/vehicles` — a driver's registered vehicle(s) (registration Step 6).

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/mine` | Driver | — | List my registered vehicles. |
| POST | `/` | Driver | `{ vehicleTypeId, model, year, registrationNumber, brand?, color?, vin?, seats?, fuelType?, transmission? }` | Add a vehicle. Deactivates any previously-active vehicle and mirrors the summary onto the driver's profile (used by fare/matching). |
| PATCH | `/:id` | Driver | partial vehicle fields | Update one of my vehicles. |
| DELETE | `/:id` | Driver | — | Soft-remove a vehicle (deactivates it). |
| GET | `/admin/drivers/:driverId` | Admin | — | List a specific driver's vehicles. |

## Documents

Base path: `/documents` — driver document upload + admin verification (registration Step 7).

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/types` | Driver | — | List active document types the driver may need to upload. |
| GET | `/mine` | Driver | — | List my uploaded documents + their verification status. |
| POST | `/:documentTypeId/upload-url` | Driver | `{ side: "front"\|"back"\|"pdf", contentType }` | Get a presigned S3 upload URL for one side of a document. |
| POST | `/:documentTypeId` | Driver | `{ side, key, documentNumber?, expiryDate? }` | Confirm an upload completed; verifies the file exists, rejects already-expired dates. |
| GET | `/admin/types` | Admin | — | List all document types (paginated). |
| POST | `/admin/types` | Admin | `{ code, requiresFront?, requiresBack?, requiresPdf?, requiresExpiry?, requiresDocNumber?, maxFileSizeMb?, sortOrder? }` | Create a new document type. |
| PATCH | `/admin/types/:id` | Admin | partial fields | Update a document type. |
| GET | `/admin/types/:id/requirements` | Admin | — | List the country/city/vehicle-type scoping rules for a document type. |
| POST | `/admin/types/:id/requirements` | Admin | `{ countryId?, cityId?, vehicleTypeId?, isRequired? }` | Add a scoping rule (e.g. "not required in country X"). |
| DELETE | `/admin/requirements/:id` | Admin | — | Remove a scoping rule. |
| GET | `/admin/drivers/:driverId` | Admin | — | View a driver's uploaded documents with short-lived signed preview URLs. |
| POST | `/admin/:docId/verify` | Admin | `{ approve: true\|false, rejectionReason? }` | Approve or reject a single uploaded document. |

## Onboarding

Base path: `/onboarding` — dynamic questionnaire, legal docs, and the one-shot config/resume bundle.

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/config` | Driver | `?lang=` | One-shot bundle for rendering the onboarding flow: countries, active questionnaire, required documents, vehicle types, active legal docs — all localized. Fetch once when entering onboarding. |
| GET | `/state` | Driver | — | `{ registrationStatus, registrationStep, pendingLegalAcceptance }` — call on login to resume onboarding at the right step. |
| GET | `/questions` | Driver | `?countryId=&lang=` | Get the active questionnaire (defaults to the driver's own country). |
| POST | `/answers` | Driver | `{ answers: [{ questionId, value }] }` | Submit/update answers. Server re-validates conditional visibility rules. |
| GET | `/answers/mine` | Driver | — | Get my previously submitted answers. |
| GET | `/legal/:type` | Driver | `?countryId=` (`type` = `terms` \| `privacy_policy`) | Get the currently-active legal document of this type. |
| POST | `/legal/accept` | Driver | `{ legalDocumentId }` | Record acceptance of Terms/Privacy Policy. |
| GET | `/admin/questions` | Admin | — | List all onboarding questions (paginated). |
| POST | `/admin/questions` | Admin | `{ code, questionType, isRequired?, sortOrder?, countryId?, minValue?, maxValue?, dependsOnQuestionId?, dependsOnOperator?, dependsOnValue? }` | Create a question. `questionType`: `single_choice`\|`multiple_choice`\|`dropdown`\|`yes_no`\|`rating`\|`text`\|`number`\|`date`. |
| PATCH | `/admin/questions/:id` | Admin | partial fields | Update a question. |
| PATCH | `/admin/questions/reorder` | Admin | `{ orderedIds: [...] }` | Bulk-reorder questions (drag-and-drop). |
| POST | `/admin/questions/:id/options` | Admin | `{ code, sortOrder? }` | Add a choice option to a single/multiple-choice or dropdown question. |
| PATCH | `/admin/options/:id` | Admin | partial fields | Update an option. |
| DELETE | `/admin/options/:id` | Admin | — | Remove an option. |
| PUT | `/admin/translations/:entityType/:entityId` | Admin | `{ items: [{ fieldName, languageCode, value }] }` | Upsert translations for any admin-editable entity (questions, options, etc). |
| GET | `/admin/legal` | Admin | — | List legal document versions (paginated). |
| POST | `/admin/legal` | Admin | `{ type, version, contentUrl, effectiveFrom, countryId?, isActive? }` | Publish a new legal document version (auto-supersedes the prior active one for the same type/country). |

## Geo

Base path: `/geo` — countries → states → cities, used for the driving-location picker.

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/countries` | Public | — | List active countries. |
| GET | `/countries/:countryId/states` | Public | — | List active states in a country. |
| GET | `/states/:stateId/cities` | Public | — | List active cities in a state. |
| GET | `/admin/countries` | Admin | — | List all countries (paginated). |
| POST | `/admin/countries` | Admin | `{ name, isoCode, dialCode, currencyCode, defaultLanguageCode?, sortOrder? }` | Add a country. |
| PATCH | `/admin/countries/:id` | Admin | partial fields | Update a country. |
| PATCH | `/admin/countries/:id/enable` | Admin | — | Enable a country. |
| PATCH | `/admin/countries/:id/disable` | Admin | — | Disable a country. |
| GET | `/admin/states` | Admin | `?countryId=` | List states (paginated). |
| POST | `/admin/states` | Admin | `{ countryId, name, code? }` | Add a state. |
| PATCH | `/admin/states/:id` | Admin | partial fields | Update a state. |
| PATCH | `/admin/states/:id/enable` | Admin | — | Enable a state. |
| PATCH | `/admin/states/:id/disable` | Admin | — | Disable a state. |
| GET | `/admin/cities` | Admin | `?countryId=&stateId=&search=` | List cities (paginated, searchable). |
| POST | `/admin/cities` | Admin | `{ stateId, countryId, name, timezone?, sortOrder? }` | Add a city. |
| PATCH | `/admin/cities/:id` | Admin | partial fields | Update a city. |
| PATCH | `/admin/cities/:id/enable` | Admin | — | Enable a city (drivers can select it). |
| PATCH | `/admin/cities/:id/disable` | Admin | — | Disable a city. |

## Rider

Base path: `/riders`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/profile` | Rider | — | Get the logged-in rider's profile. |
| PATCH | `/profile` | Rider | profile fields | Update profile. |
| GET | `/rides` | Rider | — | Paginated ride history. |
| PATCH | `/fcm-token` | Rider | `{ fcmToken }` | Update push-notification token. |
| GET | `/` | Admin | `?isVerified=&isBlocked=&search=` | List/search riders (paginated). |
| POST | `/` | Admin | `{ phone, name, ... }` | Admin-create a rider account. |
| PATCH | `/:id` | Admin | partial fields | Admin-update a rider. |

## Vehicle Types

Base path: `/vehicle-types` — the rate/category classes (Bike, Auto, Cab, …).

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/` | Public | `?all=true` (admin paginated view) | List active vehicle types (or all, paginated, for admin). |
| GET | `/:id` | Public | — | Get one vehicle type. |
| POST | `/` | Admin | `{ name, baseRate, perKmRate, perMinRate, capacity?, minFare?, sortOrder?, icon? }` | Create a vehicle type. |
| PATCH | `/:id` | Admin | partial fields | Update a vehicle type. |
| DELETE | `/:id` | Admin | — | Soft-delete (deactivate) a vehicle type. |

## Zones

Base path: `/zones` — geofenced pricing zones (city centre, airport, etc).

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/` | Public | `?page=` (paginated if provided) | List zones. |
| GET | `/:id` | Public | — | Get one zone. |
| POST | `/detect` | Public | `{ lat, lng }` | Find which zone a point falls in (or `null`). |
| POST | `/` | Admin | `{ name, type, polygon, multiplier?, description? }` | Create a zone. |
| PATCH | `/:id` | Admin | partial fields | Update a zone. |
| DELETE | `/:id` | Admin | — | Delete a zone. |

## Fare

Base path: `/fare`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/estimate` | Public | `{ pickupLat, pickupLng, dropLat, dropLng, vehicleTypeId }` | Estimate fare for one vehicle type. |
| POST | `/estimate-all` | Public | `{ pickupLat, pickupLng, dropLat, dropLng }` | Estimate fare for every active vehicle type (booking screen). |
| GET | `/rules` | Admin | — | List fare rules (paginated). |
| GET | `/rules/:id` | Admin | — | Get one fare rule. |
| POST | `/rules` | Admin | `{ name, ruleType, multiplier, ... }` | Create a fare rule (time/zone/traffic-based surge). |
| PATCH | `/rules/:id` | Admin | partial fields | Update a fare rule. |
| DELETE | `/rules/:id` | Admin | — | Delete a fare rule. |

## Rides

Base path: `/rides`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/` | Rider | `{ vehicleTypeId, pickupLat, pickupLng, pickupAddress?, dropLat, dropLng, dropAddress? }` | Request a ride — kicks off matching. |
| GET | `/:id` | Rider | — | Get ride details. |
| POST | `/:id/cancel` | Rider | `{ reason? }` | Cancel a ride (aborts matching immediately if still searching). |
| POST | `/:id/rate` | Rider | `{ rating (1-5), review? }` | Rate the driver after a completed ride. |
| GET | `/:id/offers` | Rider | — | Full broadcast/offer history for my own ride. |
| GET | `/:id/history` | Rider | — | Full status-change timeline for my own ride. |
| POST | `/:id/accept` | Driver | — | Accept an offered ride. |
| POST | `/:id/arriving` | Driver | — | Mark as arriving at pickup. |
| POST | `/:id/start` | Driver | — | Start the trip. |
| POST | `/:id/complete` | Driver | — | Complete the trip. |
| POST | `/:id/driver-cancel` | Driver | `{ reason? }` | Driver cancels an accepted ride (triggers re-matching). |
| POST | `/:id/decline` | Driver | `{ reason? }` | Explicitly decline an offered ride. |
| GET | `/driver/active` | Driver | — | Get my current active ride, if any. |
| GET | `/driver/offers` | Driver | `?status=` | My own ride-offer inbox (paginated). |
| GET | `/` | Admin | `?status=&driverId=&riderId=` | List all rides (paginated). |
| GET | `/:id/offers/admin` | Admin | — | View any ride's offer history. |
| GET | `/:id/history/admin` | Admin | — | View any ride's status timeline. |

## Tracking

Base path: `/tracking`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/:rideId` | Rider | — | Full live tracking state for the map: driver position, approach route, or trip progress. |
| GET | `/:rideId/driver` | Driver | — | Ride context (pickup/drop coords, polyline, fare) for the driver's own route overlay. |

## Subscriptions

Base path: `/subscriptions` — the core revenue model: drivers pay for a plan instead of per-ride commission.

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/plans` | Public | — | List active subscription plans. |
| POST | `/initiate` | Driver | `{ planId }` | Start a subscription purchase (creates a Razorpay order). |
| POST | `/verify` | Driver | `{ planId, razorpayOrderId, razorpayPaymentId, razorpaySignature }` | Verify payment signature → activate the subscription. |
| GET | `/mine` | Driver | — | Get my current subscription. |
| GET | `/history` | Driver | — | Paginated subscription history. |
| POST | `/webhook/razorpay` | Public (HMAC-signed) | raw Razorpay payload | Razorpay webhook — signature verified via `X-Razorpay-Signature` header. |
| GET | `/plans/all` | Admin | — | List all plans, including inactive (paginated). |
| POST | `/plans` | Admin | `{ name, type, price, durationDays?, trialDays?, features?, vehicleTypeIds?, maxRidesPerDay?, sortOrder? }` | Create a plan (any `type`: monthly/quarterly/yearly/lifetime/custom). |
| PATCH | `/plans/:id` | Admin | partial fields | Update a plan. |
| DELETE | `/plans/:id` | Admin | — | Delete/deactivate a plan. |

## Admin — platform stats

Base path: `/admin` — every route here requires Admin auth.

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/dashboard` | — | High-level platform stats: driver/rider/ride/subscription counts. |
| GET | `/stats/rides` | `?days=` | Daily ride stats (completed/cancelled/expired/total) for the last N days. |
| GET | `/stats/subscriptions` | — | Subscription counts broken down by plan. |
| GET | `/audit-logs` | `?actorType=&action=` | Paginated audit log. |
| GET | `/ride-history` | `?rideId=` | Global ride status-change log across all rides (paginated). |
