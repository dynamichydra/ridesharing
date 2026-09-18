# RideShare Customer (Rider) API & Features Specification

This document provides a comprehensive breakdown of all **Customer / Rider facing features, API routes, HTTP methods, payloads, and real-time Socket.IO events** available in [`backend_v2`](file:///Users/anis/Desktop/ride-sharing/backend_v2).

---

## 📑 Table of Contents
1. [General Conventions & Authentication](#1-general-conventions--authentication)
2. [Rider Authentication & Session Management](#2-rider-authentication--session-management)
3. [Rider Profile, Preferences & Account](#3-rider-profile-preferences--account)
4. [Service Areas, Zones & Geo Location](#4-service-areas-zones--geo-location)
5. [Vehicle Types & Rate Cards](#5-vehicle-types--rate-cards)
6. [Fare Estimation, Pricing & Availability](#6-fare-estimation-pricing--availability)
7. [Ride Booking Lifecycle (Immediate & Scheduled)](#7-ride-booking-lifecycle-immediate--scheduled)
8. [Live Ride Tracking & Real-Time Socket.IO](#8-live-ride-tracking--real-time-socketio)
9. [In-Trip Chat (Rider ↔ Driver)](#9-in-trip-chat-rider--driver)
10. [Ride Ratings, Reviews & Driver Tipping](#10-ride-ratings-reviews--driver-tipping)
11. [Payments, Fare Splitting & Invoices](#11-payments-fare-splitting--invoices)
12. [Rider Wallet, Top-ups & Withdrawals](#12-rider-wallet-top-ups--withdrawals)
13. [Rider Subscriptions & Passes](#13-rider-subscriptions--passes)
14. [Promo Codes, Discounts & Referrals](#14-promo-codes-discounts--referrals)
15. [Safety, SOS Alerts & Live Trip Sharing](#15-safety-sos-alerts--live-trip-sharing)
16. [Saved Places (Favorites/Home/Work)](#16-saved-places-favoriteshomework)
17. [Ride Disputes, Support & Lost Items](#17-ride-disputes-support--lost-items)
18. [In-App Notifications & Unread Counts](#18-in-app-notifications--unread-counts)
19. [Corporate Billing & Business Accounts](#19-corporate-billing--business-accounts)

---

## 1. General Conventions & Authentication

- **Base URL**: `http://localhost:3000/api/v1` (Android Emulator: `http://10.0.2.2:3000/api/v1`)
- **Socket.IO Base URL**: `http://localhost:3000` (Mounted directly on the raw HTTP server)
- **Rider Namespace**: `/rider`
- **Standard Envelope**:
  ```json
  { "SUCCESS": true, "MESSAGE": { ... } }
  ```
- **List / Pagination Envelope**:
  ```json
  {
    "SUCCESS": true,
    "MESSAGE": [ ... ],
    "COUNT": 10,
    "PAGINATION": { "currentPage": 1, "itemsPerPage": 20, "totalItems": 45, "totalPages": 3 }
  }
  ```
- **Error Envelope**:
  ```json
  { "SUCCESS": false, "MESSAGE": "Error description", "CODE": "ERROR_CODE" }
  ```
- **Currency & Money Representation**: All monetary values are integer minor units (e.g. `10000` = `100.00 INR` or `$100.00 CAD`).

---

## 2. Rider Authentication & Session Management

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/rider/send-otp` | Public | `{ "phone": "+919876543210" }` | Sends 6-digit verification code to rider phone. |
| `POST` | `/api/v1/auth/rider/verify-otp` | Public | `{ "phone": "+919876543210", "otp": "123456" }` | Verifies OTP; auto-registers new rider or logs in existing rider. Returns `accessToken`, `refreshToken`, and user object. |
| `POST` | `/api/v1/auth/refresh` | Public | `{ "refreshToken": "<token>" }` | Issues a new `accessToken`. |
| `POST` | `/api/v1/auth/logout` | Any | `{ "deviceId": "<optional_id>" }` | Invalidates active refresh token and logs out rider. |

---

## 3. Rider Profile, Preferences & Account

| Method | Endpoint | Auth | Request Body / Params | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/riders/me` | Rider | — | Returns full rider profile with current statistics and telemetry. |
| `GET` | `/api/v1/riders/profile` | Rider | — | Fetches standard rider profile (Name, email, phone, avatar, rating). |
| `PATCH` | `/api/v1/riders/profile` | Rider | `{ "name": "John Doe", "email": "john@example.com", "profilePhoto": "https://..." }` | Updates personal profile information. |
| `PATCH` | `/api/v1/riders/fcm-token` | Rider | `{ "fcmToken": "<fcm_token>" }` | Registers device FCM token for push notifications. |
| `GET` | `/api/v1/riders/preferences` | Rider | — | Retrieves rider ride preferences (e.g. Quiet ride, AC temp, luggage space). |
| `PUT` | `/api/v1/riders/preferences` | Rider | `{ "music": "silent", "ac": "on", "chat": "quiet" }` | Saves personalized trip preferences. |
| `GET` | `/api/v1/riders/rides` | Rider | `?page=1&limit=20` | Paginated ride history for the rider. |

---

## 4. Service Areas, Zones & Geo Location

| Method | Endpoint | Auth | Request Body / Params | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/geo/countries` | Public | — | Lists supported countries with dial codes, currency codes, and flags. |
| `GET` | `/api/v1/geo/countries/:countryId/states` | Public | — | Lists states/provinces within a selected country. |
| `GET` | `/api/v1/geo/states/:stateId/cities` | Public | — | Lists operational cities within a state. |
| `POST` | `/api/v1/zones/detect` | Public | `{ "lat": 12.9716, "lng": 77.5946 }` | Checks if point is inside a serviceable zone (City, Airport, High-demand area). |
| `POST` | `/api/v1/zones/resolve-hex` | Public | `{ "lat": 12.9716, "lng": 77.5946 }` | Resolves H3 spatial hex cells for dynamic pricing and geo-boundaries. |

---

## 5. Vehicle Types & Rate Cards

| Method | Endpoint | Auth | Request Body / Params | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/vehicle-types` | Public | — | Global catalog of available vehicle classes (e.g., Bike, Auto, Economy Cab, Premium Sedan, XL). |
| `GET` | `/api/v1/vehicle-types/:id` | Public | — | Details of a specific vehicle class. |
| `GET` | `/api/v1/vehicle-types/:id/pricing` | Public | `?countryId=<id>` | Country-specific rate card (Base fare, per km, per min, min fare). |

---

## 6. Fare Estimation, Pricing & Availability

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/fare/estimate` | Public | `{ "pickupLat": 12.97, "pickupLng": 77.59, "dropLat": 12.93, "dropLng": 77.62, "vehicleTypeId": "<id>" }` | Calculates estimated price, distance, duration, taxes, and surge multiplier for a single vehicle type. |
| `POST` | `/api/v1/fare/estimate-all` | Public | `{ "pickupLat": 12.97, "pickupLng": 77.59, "dropLat": 12.93, "dropLng": 77.62 }` | Estimates fares for all active vehicle types for booking comparisons. |
| `POST` | `/api/v1/fare/available` | Rider | `{ "pickupLat": 12.97, "pickupLng": 77.59, "dropLat": 12.93, "dropLng": 77.62 }` | Returns estimated fares **only for vehicle types that currently have online/available drivers nearby**. |
| `POST` | `/api/v1/fare/quote` | Public | `{ "pickupLat": 12.97, "pickupLng": 77.59, "dropLat": 12.93, "dropLng": 77.62, "vehicleTypeId": "<id>", "promoCode": "<code_optional>" }` | Locks a guaranteed price quote snapshot for booking. |

---

## 7. Ride Booking Lifecycle (Immediate & Scheduled)

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/rides` | Rider | `{ "vehicleTypeId": "<id>", "pickupLat": 12.97, "pickupLng": 77.59, "pickupAddress": "MG Road", "dropLat": 12.93, "dropLng": 77.62, "dropAddress": "Koramangala", "paymentMethod": "cash" \| "wallet" \| "online" }` | Requests an on-demand ride and triggers the dispatch & matching engine. |
| `GET` | `/api/v1/rides/:id` | Rider | — | Fetches live ride status, driver details, OTP, pricing, and coordinates. |
| `POST` | `/api/v1/rides/:id/cancel` | Rider | `{ "reason": "Changed plans" }` | Cancels ride request (immediately aborts matching engine if search is active). |
| `GET` | `/api/v1/rides/:id/receipt` | Any | — | Generates finalized itemized ride receipt (distance, duration, base fare, surge, tax, discounts, tips). |
| `GET` | `/api/v1/rides/:id/offers` | Rider | — | Timeline of driver broadcast dispatches and responses for the ride. |
| `GET` | `/api/v1/rides/:id/history` | Rider | — | Detailed state transition audit log of the ride (`requested` → `matched` → `arrived` → `started` → `completed`). |
| `POST` | `/api/v1/rides/schedule` | Rider | `{ "vehicleTypeId": "<id>", "pickupLat": 12.97, "pickupLng": 77.59, "dropLat": 12.93, "dropLng": 77.62, "scheduledAt": "2026-09-05T09:00:00Z" }` | Creates a pre-scheduled ride booking. |
| `GET` | `/api/v1/rides/scheduled/mine` | Rider | — | Lists rider's upcoming scheduled rides. |
| `DELETE` | `/api/v1/rides/scheduled/:id` | Rider | — | Cancels an upcoming scheduled ride. |

---

## 8. Live Ride Tracking & Real-Time Socket.IO

### REST Endpoints
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/tracking/:rideId` | Rider | Full live tracking state snapshot: driver location, bearing, approach polyline route, ETA, and trip progress. |

### Socket.IO Connection (`/rider` Namespace)
- **Connection URL**: `${BASE_URL}/rider`
- **Auth Payload**: `{ "token": "<rider_access_token>" }`

#### Client Emits (Rider → Server):
- `ride:subscribe`: `{ "rideId": "<ride_id>" }` — Subscribes to live room events for this ride.
- `ride:unsubscribe`: `{ "rideId": "<ride_id>" }` — Leaves the ride room.
- `chat:send`: `{ "rideId": "<id>", "content": "I am standing at gate 2", "messageType": "text" }` — Sends message to assigned driver.
- `chat:read`: `{ "rideId": "<id>" }` — Marks incoming driver chat messages as read.

#### Server Emits (Server → Rider):
- `ride:driver_assigned`: `{ "rideId": "...", "driver": { "id": "...", "name": "...", "phone": "...", "photo": "...", "vehicle": { "model": "...", "plate": "..." }, "rating": 4.9 }, "startOtp": "1234" }`
- `driver:location`: `{ "rideId": "...", "driverId": "...", "lat": 12.97, "lng": 77.59, "phase": "approach" \| "trip", "approachProgress": { ... }, "tripProgress": { ... } }`
- `driver:arrived` / `ride:arriving`: `{ "rideId": "...", "driverArrivedAt": "...", "freeWaitingMinutes": 3 }`
- `ride:started`: `{ "rideId": "..." }` — Triggered when driver enters the verified OTP.
- `ride:completed`: `{ "rideId": "...", "finalFare": 250.00, "currency": "INR" }`
- `ride:cancelled`: `{ "rideId": "...", "reason": "..." }`
- `ride:driver_cancelled`: `{ "rideId": "...", "reason": "..." }` — Notifies rider that driver cancelled; triggers automated re-matching.

---

## 9. In-Trip Chat (Rider ↔ Driver)

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/rides/:id/messages` | Any | — | Fetches in-trip message history between rider and driver. |
| `POST` | `/api/v1/rides/:id/messages` | Any | `{ "content": "Where are you?", "messageType": "text" }` | REST alternative to send in-trip message to driver. |

---

## 10. Ride Ratings, Reviews & Driver Tipping

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/rides/:id/rate` | Rider | `{ "rating": 5, "review": "Smooth and polite driving!" }` | Submits 1-5 star driver rating and written feedback. |
| `POST` | `/api/v1/rides/:id/tip` | Rider | `{ "tipAmountMinor": 5000 }` | Adds gratuity/tip (50 INR) to driver post-ride. |

---

## 11. Payments, Fare Splitting & Invoices

| Method | Endpoint | Auth | Request Body / Params | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/ride-payments/:rideId/initiate` | Rider | Header `Idempotency-Key: <uuid>` | Initiates payment gateway order (Razorpay/Stripe) for completed ride. |
| `POST` | `/api/v1/ride-payments/:rideId/verify` | Rider | `{ "orderRef": "<order_id>", "paymentRef": "<payment_id>", "signature": "<sig>" }` | Verifies gateway payment and marks ride paid. |
| `GET` | `/api/v1/ride-payments/mine` | Rider | `?page=1&limit=20` | Full list of digital payments made by the rider. |
| `GET` | `/api/v1/ride-payments/:rideId` | Any | — | Returns payment status and ledger capture details for a ride. |
| `GET` | `/api/v1/ride-payments/:rideId/invoice` | Any | — | Generates printable digital tax invoice with tax breakdown. |
| `POST` | `/api/v1/ride-payments/:rideId/fare-split/invite` | Rider | `{ "phone": "+919876543211" }` | Invites a co-passenger to split ride fare. |
| `POST` | `/api/v1/ride-payments/:rideId/fare-split/respond` | Rider | `{ "accept": true }` | Accepts or declines incoming fare split request. |
| `POST` | `/api/v1/ride-payments/:rideId/fare-split/cancel` | Rider | `{ "splitId": "<id>" }` | Cancels a pending split invitation. |
| `POST` | `/api/v1/ride-payments/:rideId/fare-split/pay-wallet` | Rider | Header `Idempotency-Key: <uuid>` | Pays participant's split share using in-app wallet balance. |
| `GET` | `/api/v1/ride-payments/:rideId/fare-split` | Rider | — | Status of all split shares for the ride. |

---

## 12. Rider Wallet, Top-ups & Withdrawals

| Method | Endpoint | Auth | Request Body / Params | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/wallets/me` | Any | — | Returns wallet balance, currency, and account status. Auto-creates wallet if absent. |
| `GET` | `/api/v1/wallets/me/transactions` | Any | `?page=1&limit=20` | Paginated wallet ledger history (Credits, debits, refunds, ride payments). |
| `POST` | `/api/v1/wallets/me/topup/initiate` | Any | Header `Idempotency-Key: <uuid>`, Body: `{ "amountMinor": 50000 }` | Starts wallet recharge via payment gateway. |
| `POST` | `/api/v1/wallets/me/topup/verify` | Any | `{ "orderRef": "...", "paymentRef": "...", "signature": "..." }` | Verifies top-up payment and credits wallet. |
| `POST` | `/api/v1/wallets/me/topup/demo` | Any | `{ "amountMinor": 50000 }` | Adds sandbox demo balance for testing. |
| `POST` | `/api/v1/wallets/me/withdraw/request` | Rider | `{ "amountMinor": 20000, "reason": "Refund balance" }` | Requests payout of unutilized wallet balance back to bank/UPI. |
| `GET` | `/api/v1/wallets/me/withdrawals` | Rider | `?page=1&limit=20` | Status of withdrawal requests. |

---

## 13. Rider Subscriptions & Passes

| Method | Endpoint | Auth | Request Body / Params | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/rider-plans/plans` | Public | `?countryId=<id>` | Lists rider membership packages (e.g. Daily commuter pass, Zero-surge pass, Flat discount tier). |
| `POST` | `/api/v1/rider-plans/initiate` | Rider | `{ "planId": "<id>" }` | Initiates purchase for a rider subscription pass. |
| `POST` | `/api/v1/rider-plans/verify` | Rider | `{ "planId": "<id>", "orderRef": "...", "paymentRef": "..." }` | Confirms pass purchase and activates perks on rider account. |
| `GET` | `/api/v1/rider-plans/mine` | Rider | — | Fetches currently active pass, remaining rides, and expiration date. |
| `GET` | `/api/v1/rider-plans/history` | Rider | `?page=1&limit=20` | Past subscription purchases. |

---

## 14. Promo Codes, Discounts & Referrals

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/promos/validate` | Rider | `{ "code": "SAVE50", "fareMinor": 20000, "countryId": "<id>" }` | Checks coupon validity, calculates discount amount, and returns net payable fare. |
| `GET` | `/api/v1/promos/referrals/my-code` | Rider | — | Retrieves rider's unique referral link, invite code, and reward earnings. |
| `POST` | `/api/v1/promos/referrals/apply` | Rider | `{ "referralCode": "RYVA2026" }` | Applies invite code during onboarding to claim welcome credits. |

---

## 15. Safety, SOS Alerts & Live Trip Sharing

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/trusted-contacts` | Rider | `{ "name": "Jane", "phone": "+919876543212", "relationship": "Sister" }` | Adds emergency contact for automated trip sharing / safety triggers. |
| `GET` | `/api/v1/trusted-contacts` | Rider | — | Lists rider's registered emergency contacts. |
| `DELETE` | `/api/v1/trusted-contacts/:id` | Rider | — | Removes an emergency contact. |
| `POST` | `/api/v1/rides/:rideId/sos` | Any | `{ "lat": 12.97, "lng": 77.59, "note": "Emergency assistance requested" }` | **Emergency SOS Button**: Alerts 24/7 admin safety ops, broadcasts emergency SMS/push to trusted contacts with live coordinates. |
| `POST` | `/api/v1/rides/:rideId/share-token` | Rider | — | Generates public web tracking token for friends & family. |
| `GET` | `/api/v1/tracking/public/:token` | Public | — | Live public tracking link for shared trips without requiring login. |

---

## 16. Saved Places (Favorites/Home/Work)

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/saved-places` | Rider | — | Lists favorite destinations (Home, Work, Gym, Custom). |
| `POST` | `/api/v1/saved-places` | Rider | `{ "title": "Home", "address": "123 Main St", "lat": 12.97, "lng": 77.59, "type": "home" }` | Creates or upserts a saved location. |
| `PATCH` | `/api/v1/saved-places/:id` | Rider | `{ "title": "New Office", "address": "...", "lat": ..., "lng": ... }` | Updates saved location details. |
| `DELETE` | `/api/v1/saved-places/:id` | Rider | — | Deletes a saved place. |

---

## 17. Ride Disputes, Support & Lost Items

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/ride-disputes` | Any | `{ "rideId": "<id>", "reason": "overcharged" \| "driver_behavior" \| "wrong_route", "description": "Driver took longer route" }` | Opens a dispute ticket for review by support team. |
| `GET` | `/api/v1/ride-disputes/mine` | Any | `?page=1&limit=20` | Lists customer's open and resolved dispute tickets. |
| `GET` | `/api/v1/ride-disputes/:id` | Any | — | Details, notes, and resolution status of a specific dispute. |
| `POST` | `/api/v1/lost-items/rides/:rideId` | Any | `{ "itemCategory": "phone" \| "wallet" \| "keys" \| "other", "description": "Black iPhone in back seat", "contactPhone": "+919876543210", "photoUrl": "https://..." }` | Files a lost item report on a completed ride. |
| `GET` | `/api/v1/lost-items/mine` | Any | — | Lists reported lost items and driver resolution contact status. |
| `GET` | `/api/v1/lost-items/rides/:rideId` | Any | — | Checks lost item ticket status for a ride. |

---

## 18. In-App Notifications & Unread Counts

| Method | Endpoint | Auth | Request Body / Params | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/rider/notifications` | Rider | `?page=1&limit=20` | Paginated in-app notification inbox. |
| `GET` | `/api/v1/rider/notifications/unread-count` | Rider | — | Returns count of unread notifications for badge display. |
| `PATCH` | `/api/v1/rider/notifications/:id/read` | Rider | — | Marks a notification as read. |

---

## 19. Corporate Billing & Business Accounts

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/corporate/accounts` | Rider | — | Lists corporate accounts the rider is affiliated with. |
| `GET` | `/api/v1/corporate/accounts/:id/credit-check` | Rider | `?amountMinor=15000` | Validates if corporate account has credit limit available for business ride. |
| `GET` | `/api/v1/corporate/invoices` | Rider | `?corporateAccountId=<id>` | Lists monthly consolidated corporate billing statements. |
