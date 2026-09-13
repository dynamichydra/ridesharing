# Customer (Rider) Feature Gap Audit

## Audit Information

**Backend:** `backend_v2`  
**Flutter App:** `ride_sharing_customer` (`app/ride_sharing_customer`)  
**Audit Date:** 2026-09-13  
**Auditor:** Senior Flutter + Node.js Architect  
**Status:** COMPLETED  

> **Methodology:** Backend-first. Every customer/rider-facing API route, socket event, database table, background job, and business rule in `backend_v2` was systematically audited first. The Flutter customer project was then searched globally by endpoint, class name, socket event, repository, and UI workflow. Only after tracing UI → BLoC → Repository → Datasource → API was each feature classified.

---

# Executive Summary

| Metric | Count |
|---|---|
| Total backend customer/rider features identified | 82 |
| **COMPLETE** | 27 |
| **PARTIAL** | 8 |
| **MISSING** | 39 |
| **INCORRECT** | 4 |
| **UI_ONLY** | 2 |
| **API_ONLY** | 2 |

---

# Feature Summary Table

| # | Feature | Backend | Flutter | Status | Priority |
|---|---|---|---|---|---|
| 1 | Rider Phone OTP Send | Yes | Yes | COMPLETE | P0 |
| 2 | Rider OTP Verification | Yes | Yes | COMPLETE | P0 |
| 3 | Rider Profile Setup (Onboarding) | Yes | Yes | COMPLETE | P0 |
| 4 | JWT Token Refresh (401 Interceptor) | Yes | Yes | COMPLETE | P0 |
| 5 | Logout & Session Revocation | Yes | Yes | COMPLETE | P0 |
| 6 | Forgot Password / Email Auth | No | UI Only | UI_ONLY | P3 |
| 7 | Rider FCM Push Token Registration | Yes | No | MISSING | P0 |
| 8 | Get Rider Profile | Yes | Yes | COMPLETE | P0 |
| 9 | Update Rider Profile (Name, Email, Phone) | Yes | Yes | COMPLETE | P1 |
| 10 | Profile Photo / Avatar Upload | Yes | No | MISSING | P1 |
| 11 | Get Rider Preferences | Yes | No | MISSING | P2 |
| 12 | Update Rider Preferences | Yes | No | MISSING | P2 |
| 13 | Preferred Language Sync | Yes | No | MISSING | P2 |
| 14 | List Saved Places | Yes | Yes | COMPLETE | P0 |
| 15 | Add Saved Place | Yes | Yes | COMPLETE | P0 |
| 16 | Update Saved Place | Yes | Yes | COMPLETE | P0 |
| 17 | Delete Saved Place | Yes | Yes | COMPLETE | P0 |
| 18 | Vehicle Types Catalog | Yes | Yes | COMPLETE | P0 |
| 19 | Geofence & Service Area Detection | Yes | Yes | COMPLETE | P0 |
| 20 | Nearby Available Vehicles / Drivers Query | Yes | Yes | COMPLETE | P0 |
| 21 | Nearby Driver Map Markers (Home Screen Live Cars) | Yes | No | MISSING | P2 |
| 22 | Fare Estimate for Available Types | Yes | Yes | COMPLETE | P0 |
| 23 | Fare Estimate for Specific Vehicle Type | Yes | No | API_ONLY | P2 |
| 24 | Fare Quote Lock-in (`quoteId`) | Yes | No | PARTIAL | P2 |
| 25 | List Available Promo Codes | Yes | Yes | COMPLETE | P0 |
| 26 | Validate Promo Code | Yes | Yes | COMPLETE | P0 |
| 27 | Referral Program — Get My Code | Yes | Yes | COMPLETE | P1 |
| 28 | Referral Program — Apply Code | Yes | Yes | COMPLETE | P1 |
| 29 | Request Instant Ride (On-Demand) | Yes | Yes | COMPLETE | P0 |
| 30 | Book for Someone Else (Guest Passenger) | Yes | Yes | COMPLETE | P0 |
| 31 | Schedule Future Ride | Yes | No | MISSING | P1 |
| 32 | List My Scheduled Rides | Yes | No | MISSING | P1 |
| 33 | Cancel Scheduled Ride | Yes | No | MISSING | P1 |
| 34 | Socket.IO Connect & Bearer Auth (`/rider`) | Yes | Yes | COMPLETE | P0 |
| 35 | Subscribe to Ride Room (`ride:subscribe`) | Yes | Yes | COMPLETE | P0 |
| 36 | Driver Assigned Event Handling | Yes | Yes | COMPLETE | P0 |
| 37 | Driver Approaching & Arrived Events | Yes | Yes | COMPLETE | P0 |
| 38 | Driver Live GPS Streaming (`driver:location`) | Yes | Yes | COMPLETE | P0 |
| 39 | Ride Started Event (OTP Verified) | Yes | Yes | COMPLETE | P0 |
| 40 | Start Ride OTP Display for Rider | Yes | Yes | COMPLETE | P0 |
| 41 | Ride Completed Event Handling | Yes | Yes | COMPLETE | P0 |
| 42 | Ride Cancelled Event Handling | Yes | Yes | COMPLETE | P0 |
| 43 | Active Ride Recovery on App Launch / Re-open | Yes | Partial | PARTIAL | P0 |
| 44 | Ride Tracking REST State (`GET /tracking/:id`) | Yes | No | API_ONLY | P1 |
| 45 | Cancel Active Ride (Searching / Assigned) | Yes | Yes | COMPLETE | P0 |
| 46 | Cancellation Reason Dialog Selection | Yes | Partial | PARTIAL | P1 |
| 47 | Rate Driver & Submit Review | Yes | Yes | COMPLETE | P0 |
| 48 | Tip Driver (`POST /rides/:id/tip`) | Yes | No | MISSING | P1 |
| 49 | Real-Time In-Trip Chat (Socket) | Yes | Yes | COMPLETE | P0 |
| 50 | In-Trip Chat History & REST Send Fallback | Yes | Yes | COMPLETE | P0 |
| 51 | In-Trip Chat Screen & Quick Replies | Yes | Yes | COMPLETE | P0 |
| 52 | SOS Emergency Alert (`POST /rides/:id/sos`) | Yes | UI Only | UI_ONLY | P0 |
| 53 | Trusted / Emergency Contacts (CRUD) | Yes | No | MISSING | P1 |
| 54 | Generate Share Live Trip Link | Yes | Incorrect | INCORRECT | P1 |
| 55 | Public Web Trip Live Tracking | Yes | Partial | PARTIAL | P1 |
| 56 | Get Wallet Balance & Currency | Yes | Yes | COMPLETE | P0 |
| 57 | Get Wallet Transactions History | Yes | Yes | COMPLETE | P0 |
| 58 | Initiate Wallet Top-Up (Razorpay/Stripe) | Yes | Yes | COMPLETE | P0 |
| 59 | Verify Wallet Top-Up | Yes | Yes | COMPLETE | P0 |
| 60 | Wallet Demo Top-Up (Non-existent Endpoint) | No | Yes | INCORRECT | P2 |
| 61 | Request Wallet Balance Withdrawal | Yes | No | MISSING | P2 |
| 62 | Pay Ride with Wallet Balance | Yes | Yes | COMPLETE | P0 |
| 63 | Pay Ride Online via Gateway (Card / UPI) | Yes | No | MISSING | P1 |
| 64 | Ride Digital Receipt & Breakdown | Yes | Incorrect | INCORRECT | P1 |
| 65 | My Ride Payments History | Yes | No | MISSING | P2 |
| 66 | List Rider Subscription Plans | Yes | Yes | COMPLETE | P0 |
| 67 | Initiate Rider Subscription Purchase | Yes | Yes | COMPLETE | P0 |
| 68 | Verify Rider Subscription Purchase | Yes | Yes | COMPLETE | P0 |
| 69 | Get Active Rider Subscription (`/mine`) | Yes | Yes | COMPLETE | P0 |
| 70 | Rider Subscription Payment History | Yes | Yes | COMPLETE | P1 |
| 71 | In-App Notifications List | Yes | Mock | INCORRECT | P1 |
| 72 | In-App Notifications Unread Count Badge | Yes | No | MISSING | P1 |
| 73 | Mark Notification as Read (Backend) | Yes | No | MISSING | P1 |
| 74 | Push Notifications (FCM / APNs) | Yes | No | MISSING | P0 |
| 75 | Ride History List (Upcoming, Completed, Cancelled) | Yes | Yes | COMPLETE | P0 |
| 76 | Ride Details & Status Timeline Screen | Yes | No | MISSING | P1 |
| 77 | Broadcast Offers History for Ride | Yes | No | MISSING | P2 |
| 78 | Raise Ride Dispute Ticket | Yes | No | MISSING | P1 |
| 79 | List My Ride Disputes | Yes | No | MISSING | P1 |
| 80 | Respond to Ride Dispute | Yes | No | MISSING | P2 |
| 81 | Report Lost Item on Ride | Yes | No | MISSING | P1 |
| 82 | List My Lost Items | Yes | No | MISSING | P2 |

---

# Detailed Feature-by-Feature Audit

---

## 1. Authentication & Session Management

### 1.1 Rider Phone OTP Authentication
- **Backend:**
  - Route: `POST /api/v1/auth/rider/send-otp`
  - Controller/Service: `auth.service.js` → `sendOtp(phone, 'rider')`
  - Parameters: `{ phone: string }`
  - Database: `otps` table (TTL 5 minutes, bcrypt hash)
- **Flutter:**
  - Implementation: `AuthDataSourceImpl.login(phone)` in `auth_datasource.dart`
  - Repository: `AuthRepositoryImpl.login()`
  - BLoC: `AuthBloc` on `LoginSubmitted`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 1.2 Rider OTP Verification
- **Backend:**
  - Route: `POST /api/v1/auth/rider/verify-otp`
  - Controller/Service: `auth.service.js` → `verifyRiderOtp(phone, otp, app)`
  - Parameters: `{ phone, otp, countryCode?, country? }`
  - Returns: `{ accessToken, refreshToken, user, isNew, country }`
- **Flutter:**
  - Implementation: `AuthDataSourceImpl.verifyOtp(code)` in `auth_datasource.dart`
  - Secure storage persists `accessToken`, `refreshToken`, `userId`, `countryCode`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 1.3 Rider Profile Setup (Post-OTP Onboarding)
- **Backend:**
  - Route: `PATCH /api/v1/riders/profile`
  - Controller/Service: `rider.service.js` → `updateProfile(userId, data)`
  - Parameters: `{ name, email, countryCode, country }`
- **Flutter:**
  - Implementation: `AuthDataSourceImpl.registerProfileDetails(name, email)`
  - Invoked during new user registration from `signup_page.dart`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 1.4 JWT Token Refresh (401 Interceptor)
- **Backend:**
  - Route: `POST /api/v1/auth/refresh`
  - Parameters: `{ refreshToken }`
  - Returns: `{ accessToken, refreshToken }`
- **Flutter:**
  - Implementation: `DioClient` interceptor in `dio_client.dart`
  - On receiving 401 (excluding `/refresh` and `/verify-otp`), synchronously refreshes token, updates storage, and replays failed request.
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 1.5 Logout & Session Revocation
- **Backend:**
  - Route: `POST /api/v1/auth/logout`
  - Controller/Service: `auth.service.js` → `logout(userId, deviceId)`
- **Flutter:**
  - Implementation: `AuthDataSourceImpl.logout()`
  - Calls `POST /api/v1/auth/logout` and clears secure storage via `_storageService.clearAuth()`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 1.6 Forgot Password / Email Auth
- **Backend:**
  - Backend rider authentication is strictly OTP-based. No password login exists.
- **Flutter:**
  - Page `forgot_password_page.dart` has mock future `sendForgotPasswordEmail` with `Future.delayed(500)`.
- **Status:** **UI_ONLY** (Dead code)
- **Priority:** P3

---

### 1.7 Rider FCM Push Token Registration
- **Backend:**
  - Route: `PATCH /api/v1/riders/fcm-token`
  - Controller/Service: `rider.service.js` → `updateFcmToken(userId, fcmToken)`
  - Database: Updates `fcm_token` column on `users` table.
- **Flutter:**
  - Flutter app does NOT have `firebase_messaging` or `firebase_core` in `pubspec.yaml`.
  - Endpoint is NEVER called.
- **Root Cause:** Firebase SDK was not integrated into `ride_sharing_customer`.
- **Status:** **MISSING**
- **Priority:** P0 (Safety & operational: riders will never receive notifications when app is in background/closed)

---

## 2. Rider Profile & Preferences

### 2.1 Get Rider Profile
- **Backend:**
  - Route: `GET /api/v1/riders/profile` or `GET /api/v1/riders/me`
  - Controller/Service: `rider.service.js` → `getProfile(userId)`
  - Returns: User identity, email, phone, avatar, rating, verification status.
- **Flutter:**
  - Implementation: `ProfileDataSourceImpl.getUserProfile()` in `profile_datasource.dart`
  - Caches profile locally in `StorageService`.
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 2.2 Update Rider Profile
- **Backend:**
  - Route: `PATCH /api/v1/riders/profile`
  - Controller/Service: `rider.service.js` → `updateProfile(userId, body)`
- **Flutter:**
  - Implementation: `ProfileDataSourceImpl.updateUserProfile(name, email, phone)` in `edit_profile_page.dart`
- **Status:** **COMPLETE**
- **Priority:** P1

---

### 2.3 Profile Photo / Avatar Upload
- **Backend:**
  - Route: `POST /api/v1/dev-storage/upload` or `POST /api/v1/documents`
  - Profile supports `profilePhoto` URL column.
- **Flutter:**
  - `edit_profile_page.dart` has static avatar icon; no image picker or upload logic exists.
- **Status:** **MISSING**
- **Priority:** P1

---

### 2.4 Rider Preferences (Get & Update)
- **Backend:**
  - Route: `GET /api/v1/riders/preferences`
  - Route: `PUT /api/v1/riders/preferences`
  - Service: `rider-preferences.service.js`
  - Fields supported:
    - `quietRide`: boolean (prefers quiet driver)
    - `temperature`: 'no_preference' | 'warm' | 'cool'
    - `petFriendly`: boolean
    - `wheelchairAccessible`: boolean
    - `childSeat`: boolean
    - `preferredLanguage`: string (e.g. 'en', 'hi', 'bn')
    - `musicPreference`: string | null
- **Flutter:**
  - Completely missing. No UI in `settings_page.dart` or booking options.
- **Status:** **MISSING**
- **Priority:** P2

---

## 3. Saved Places (Favorites)

### 3.1 List Saved Places
- **Backend:**
  - Route: `GET /api/v1/saved-places`
  - Controller/Service: `saved-place.service.js` → `listSavedPlaces(userId)`
  - Returns places sorted with Home and Work first, then custom favorites.
- **Flutter:**
  - Implementation: `HomeDataSourceImpl.getSavedPlaces()` and `ProfileDataSourceImpl.getUserProfile()`
  - Displayed on `home_page.dart` and `saved_places_page.dart`.
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 3.2 Add / Upsert Saved Place
- **Backend:**
  - Route: `POST /api/v1/saved-places`
  - Fields: `{ label, name, address, lat, lng, isDefaultPickup }`
- **Flutter:**
  - Implementation: `ProfileDataSourceImpl.addSavedPlace()` in `saved_places_page.dart`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 3.3 Update Saved Place
- **Backend:**
  - Route: `PATCH /api/v1/saved-places/:id`
- **Flutter:**
  - Implementation: `ProfileDataSourceImpl.updateSavedPlace(id, place)`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 3.4 Delete Saved Place
- **Backend:**
  - Route: `DELETE /api/v1/saved-places/:id`
- **Flutter:**
  - Implementation: `ProfileDataSourceImpl.deleteSavedPlace(id)`
- **Status:** **COMPLETE**
- **Priority:** P0

---

## 4. Vehicle Catalog & Geofencing

### 4.1 Vehicle Types Catalog
- **Backend:**
  - Route: `GET /api/v1/vehicle-types`
  - Returns active vehicle types with capacity, baseRate, perKmRate, perMinRate.
- **Flutter:**
  - Implementation: `BookingDataSourceImpl.getVehicles()`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 4.2 Geofence & Service Area Detection
- **Backend:**
  - Route: `POST /api/v1/zones/detect`
  - Checks if coordinates fall within operational zones and flags restricted areas.
- **Flutter:**
  - Implementation: `BookingDataSourceImpl.detectZone(lat, lng)`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 4.3 Nearby Driver Map Markers (Home Screen)
- **Backend:**
  - Redis geospatial index tracks live driver locations with 30s TTL.
- **Flutter:**
  - Home screen map only centers on user location; does not poll or stream nearby driver markers.
- **Status:** **MISSING**
- **Priority:** P2

---

## 5. Fare Estimation & Quote System

### 5.1 Fare Estimation for Available Types
- **Backend:**
  - Route: `POST /api/v1/fare/available`
  - Validates service area, checks geo-index for real nearby drivers, and returns computed fare breakdowns.
- **Flutter:**
  - Implementation: `BookingDataSourceImpl.estimateAllFares()` in `ride_options_page.dart`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 5.2 Fare Quote Lock-in (`quoteId`)
- **Backend:**
  - `fare.service.js` supports issuing and locking quotes (`validateAndLockQuote`) so riders are protected against surge fluctuations between selection and confirmation.
- **Flutter:**
  - Flutter requests rides without passing `quoteId`.
- **Status:** **PARTIAL**
- **Priority:** P2

---

## 6. Promo Codes & Referrals

### 6.1 List Available Promos
- **Backend:**
  - Route: `GET /api/v1/promos/available`
- **Flutter:**
  - Implementation: `BookingDataSourceImpl.getAvailablePromos()` in `promo_codes_page.dart`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 6.2 Validate Promo Code
- **Backend:**
  - Route: `POST /api/v1/promos/validate` ({ code, fareMinor, countryId })
- **Flutter:**
  - Implementation: `BookingDataSourceImpl.validatePromo()`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 6.3 Referral Program (Get Code & Apply Code)
- **Backend:**
  - Route: `GET /api/v1/promos/referrals/my-code`
  - Route: `POST /api/v1/promos/referrals/apply`
- **Flutter:**
  - Implementation: `BookingDataSourceImpl.getMyReferralInfo()` & `applyReferralCode()`
- **Status:** **COMPLETE**
- **Priority:** P1

---

## 7. Ride Booking & Scheduling

### 7.1 Request Instant Ride (On-Demand)
- **Backend:**
  - Route: `POST /api/v1/rides`
  - Parameters: `{ vehicleTypeId, pickupLat, pickupLng, pickupAddress, dropLat, dropLng, dropAddress, paymentMethod, promoCode, notes, passenger }`
  - Automatically triggers matching engine (1→2→3 km radial search).
- **Flutter:**
  - Implementation: `BookingDataSourceImpl.requestRide()` in `ride_options_page.dart`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 7.2 Book for Someone Else (Guest Passenger)
- **Backend:**
  - Route: `POST /api/v1/rides` with `passenger: { name, phoneNumber, passengerType, phoneCountryCode }`
  - Generates guest passenger record and unique tracking token in `trip_share_tokens` table.
- **Flutter:**
  - Implementation: `PassengerDetailsSheet.show()` in `ride_options_page.dart` collects guest details and passes to backend.
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 7.3 Scheduled Rides (Book, List, Cancel)
- **Backend:**
  - Route: `POST /api/v1/rides/schedule` ({ scheduledAt >= +30 mins })
  - Route: `GET /api/v1/rides/scheduled/mine`
  - Route: `DELETE /api/v1/rides/scheduled/:id`
- **Flutter:**
  - No date/time picker, no scheduled rides list, and no cancellation endpoint implemented.
- **Status:** **MISSING**
- **Priority:** P1

---

## 8. Real-Time Tracking & Socket.IO Lifecycle

### 8.1 Socket.IO Connection & Authentication
- **Backend:**
  - Namespace: `/rider`
  - Handshake: Bearer JWT validation. Auto-joins room `rider:${riderId}`.
- **Flutter:**
  - Implementation: `RideTrackingSocketDataSource` in `ride_tracking_socket_datasource.dart` connects with Bearer token.
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 8.2 Room Subscription
- **Backend:**
  - Event: `ride:subscribe` joins room `ride:${rideId}`
  - Event: `ride:unsubscribe` leaves room
- **Flutter:**
  - Implemented in `RideTrackingSocketDataSource.connectAndSubscribe()` and handles auto-reconnection.
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 8.3 Driver Assigned Event
- **Backend:**
  - Event: `ride:driver_assigned`
  - Payload: Driver profile, vehicle info, plate number, rating, approach route, start OTP.
- **Flutter:**
  - Implemented in `RideTrackingSocketDataSource` and handled in `RideTrackingBloc`.
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 8.4 Driver Approaching & Arrived Events
- **Backend:**
  - Events: `driver:arrived` and `ride:arriving`
- **Flutter:**
  - Implemented in `RideTrackingSocketDataSource` and triggers arrival state.
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 8.5 Driver Live GPS Streaming
- **Backend:**
  - Event: `driver:location` with `{ lat, lng, speedKmh, bearing }`
- **Flutter:**
  - Handled in `RideTrackingSocketDataSource`; updates driver car marker with smooth interpolation on Google Map.
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 8.6 Start Ride OTP Display
- **Backend:**
  - OTP is created on backend during ride creation and sent only to rider via `ride:driver_assigned`.
- **Flutter:**
  - Displayed prominently in `RideTrackingPage` for rider to verify with driver.
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 8.7 Ride Started & Ride Completed
- **Backend:**
  - Events: `ride:started`, `ride:completed`
- **Flutter:**
  - Implemented in `RideTrackingSocketDataSource` and transitions through `RideTrackingActive` to receipt view.
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 8.8 Active Ride Recovery on App Restart
- **Backend:**
  - Route: `GET /api/v1/rides/rider/active`
  - Returns the rider's currently ongoing active ride (searching, accepted, arriving, arrived, started).
- **Flutter:**
  - `RideTrackingBloc` checks local cache `active_ride_tracking`. If cache is cleared or lost, it does NOT query `GET /api/v1/rides/rider/active`.
- **Root Cause:** Client relied on local cache rather than querying backend source of truth on startup.
- **Status:** **PARTIAL**
- **Priority:** P0

---

## 9. Ride Cancellation & Completion

### 9.1 Cancel Active Ride
- **Backend:**
  - Route: `POST /api/v1/rides/:id/cancel`
  - Parameters: `{ reason: string }`
  - Signals matching loop to abort and notifies driver.
- **Flutter:**
  - Implementation: `RideTrackingRepositoryImpl.cancelRide(rideId)`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 9.2 Rate Driver & Submit Review
- **Backend:**
  - Route: `POST /api/v1/rides/:id/rate`
  - Parameters: `{ rating: 1..5, review?: string }`
- **Flutter:**
  - Implementation: `_showRateRideDialog` in `ride_tracking_page.dart` posts rating and comment.
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 9.3 Tip Driver
- **Backend:**
  - Route: `POST /api/v1/rides/:id/tip`
  - Parameters: `{ tipAmountMinor: integer }`
  - Credits driver wallet and creates tip transaction.
- **Flutter:**
  - Completely missing! No tip selector or button in completion view.
- **Status:** **MISSING**
- **Priority:** P1

---

## 10. In-Trip Chat

### 10.1 Real-Time Chat (Socket + REST)
- **Backend:**
  - Socket: `chat:send`, `chat:message`, `chat:read`
  - REST: `GET /api/v1/rides/:id/messages`, `POST /api/v1/rides/:id/messages`
- **Flutter:**
  - Implementation: `CustomerRideChatDataSource` and `CustomerRideChatPage`
  - Quick reply chips, message history, read receipts, and live socket delivery are all working.
- **Status:** **COMPLETE**
- **Priority:** P0

---

## 11. Safety & Emergency (SOS)

### 11.1 SOS Emergency Alert
- **Backend:**
  - Route: `POST /api/v1/rides/:rideId/sos`
  - Parameters: `{ lat, lng, reason }`
  - Broadcasts SOS to admin safety dashboard, notifies emergency contacts, and logs incident.
- **Flutter:**
  - A circular "SOS" button exists on `RideTrackingPage`, but its `onTap` is an EMPTY callback: `onTap: () {}`!
- **Root Cause:** UI mock was never wired to the backend API.
- **Status:** **UI_ONLY** / **MISSING** (Safety critical!)
- **Priority:** P0

---

### 11.2 Trusted Contacts Management
- **Backend:**
  - Route: `POST /api/v1/trusted-contacts`
  - Route: `GET /api/v1/trusted-contacts`
  - Route: `DELETE /api/v1/trusted-contacts/:id`
- **Flutter:**
  - Completely missing. No screen, repository, or datasource exists.
- **Status:** **MISSING**
- **Priority:** P1

---

### 11.3 Share Live Trip Link
- **Backend:**
  - Route: `POST /api/v1/rides/:rideId/share-token`
  - Returns public shareable URL token.
- **Flutter:**
  - `_shareTrackingLink` only checks `state.trackingUrl` (which is null for regular rides). It never calls `POST /api/v1/rides/:rideId/share-token`.
- **Status:** **INCORRECT**
- **Priority:** P1

---

## 12. Wallet & Payments

### 12.1 Get Wallet & Transactions
- **Backend:**
  - Route: `GET /api/v1/wallets/me`
  - Route: `GET /api/v1/wallets/me/transactions`
- **Flutter:**
  - Implementation: `WalletDataSourceImpl.getWalletDetails()` in `wallet_datasource.dart`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 12.2 Wallet Top-Up (Initiate & Verify)
- **Backend:**
  - Route: `POST /api/v1/wallets/me/topup/initiate` (with Idempotency-Key)
  - Route: `POST /api/v1/wallets/me/topup/verify`
- **Flutter:**
  - Implementation: `WalletDataSourceImpl.initiateTopup()` & `verifyTopup()`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 12.3 Wallet Demo Top-Up
- **Backend:**
  - `/api/v1/wallets/me/topup/demo` does NOT exist in `backend_v2`.
- **Flutter:**
  - `WalletDataSourceImpl.addFunds()` calls `/api/v1/wallets/me/topup/demo`.
- **Status:** **INCORRECT**
- **Priority:** P2

---

### 12.4 Wallet Withdrawal Request
- **Backend:**
  - Route: `POST /api/v1/wallets/me/withdraw/request` ({ amountMinor, reason })
  - Route: `GET /api/v1/wallets/me/withdrawals`
- **Flutter:**
  - Completely missing. No UI or methods.
- **Status:** **MISSING**
- **Priority:** P2

---

### 12.5 Pay Ride with Wallet
- **Backend:**
  - Route: `POST /api/v1/ride-payments/:rideId/pay-wallet`
- **Flutter:**
  - Implementation: `WalletDataSourceImpl.payRideWithWallet()`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 12.6 Post-Ride Online Payment (Card / UPI)
- **Backend:**
  - Route: `POST /api/v1/ride-payments/:rideId/initiate`
  - Route: `POST /api/v1/ride-payments/:rideId/verify`
- **Flutter:**
  - No gateway checkout screen for paying completed rides digitally.
- **Status:** **MISSING**
- **Priority:** P1

---

### 12.7 Ride Digital Receipt & Breakdown
- **Backend:**
  - Route: `GET /api/v1/rides/:id/receipt`
  - Route: `GET /api/v1/ride-payments/:rideId/invoice`
- **Flutter:**
  - `_buildRideCompletedReceiptView` uses hardcoded mock arithmetic:
    `final double baseFare = (price * 0.75).clamp(20.0, price);`
    `final double distanceFare = (price * 0.18).clamp(5.0, price);`
    `final double timeFare = (price - baseFare - distanceFare).clamp(0.0, price);`
  - It NEVER fetches the real breakdown from the backend receipt endpoint.
- **Status:** **INCORRECT**
- **Priority:** P1

---

## 13. Rider Subscriptions (Passes)

### 13.1 Plans, Purchase, and Active Status
- **Backend:**
  - Route: `GET /api/v1/rider-plans/plans`
  - Route: `POST /api/v1/rider-plans/initiate`
  - Route: `POST /api/v1/rider-plans/verify`
  - Route: `GET /api/v1/rider-plans/mine`
  - Route: `GET /api/v1/rider-plans/history`
- **Flutter:**
  - Implementation: `RiderSubscriptionDataSourceImpl` and `SubscriptionManagementPage`
  - Razorpay and Stripe checkout launchers integrated and functional.
- **Status:** **COMPLETE**
- **Priority:** P0

---

## 14. Notifications

### 14.1 In-App Notification Feed
- **Backend:**
  - Route: `GET /api/v1/rider/notifications`
  - Route: `GET /api/v1/rider/notifications/unread-count`
  - Route: `PATCH /api/v1/rider/notifications/:id/read`
- **Flutter:**
  - `NotificationsDataSourceImpl` reads from static JSON asset `AppMockAssets.notifications` and mutates local cache. Does not use backend APIs.
- **Status:** **INCORRECT** / **MOCK**
- **Priority:** P1

---

## 15. Ride History, Disputes & Lost Items

### 15.1 Ride History
- **Backend:**
  - Route: `GET /api/v1/riders/rides`
- **Flutter:**
  - Implementation: `ProfileDataSourceImpl.getRideHistory()` and `RideHistoryPage`
- **Status:** **COMPLETE**
- **Priority:** P0

---

### 15.2 Ride Details Screen & Timeline
- **Backend:**
  - Route: `GET /api/v1/rides/:id`
  - Route: `GET /api/v1/rides/:id/history`
- **Flutter:**
  - Tapping a past ride card does nothing. No ride details page exists.
- **Status:** **MISSING**
- **Priority:** P1

---

### 15.3 Ride Disputes
- **Backend:**
  - Route: `POST /api/v1/ride-disputes` ({ rideId, reason, description })
  - Route: `GET /api/v1/ride-disputes/mine`
  - Route: `POST /api/v1/ride-disputes/:id/respond`
- **Flutter:**
  - `help_page.dart` is static. No dispute creation, listing, or messaging.
- **Status:** **MISSING**
- **Priority:** P1

---

### 15.4 Lost Items Reporting
- **Backend:**
  - Route: `POST /api/v1/lost-items/rides/:rideId` ({ itemCategory, description, contactPhone, photoUrl })
  - Route: `GET /api/v1/lost-items/rides/:rideId`
  - Route: `GET /api/v1/lost-items/mine`
- **Flutter:**
  - Completely missing.
- **Status:** **MISSING**
- **Priority:** P1

---

# Actionable Roadmap

## Sprint 1 — P0 Critical Blockers (Production Gate)
1. **Push Notifications (FCM)** — Add `firebase_messaging`, register FCM token on `PATCH /api/v1/riders/fcm-token` upon login.
2. **Wire SOS Button** — Connect `onTap` on `RideTrackingPage` to `POST /api/v1/rides/:rideId/sos`.
3. **Active Ride Recovery** — On app startup / resume, query `GET /api/v1/rides/rider/active` directly to restore any ongoing ride if local storage is missing.
4. **Fix Share Live Trip** — Call `POST /api/v1/rides/:rideId/share-token` dynamically on `_shareTrackingLink` instead of relying only on guest bookings.

## Sprint 2 — P1 High Priority
5. **Real Ride Receipt** — Call `GET /api/v1/rides/:id/receipt` in `_buildRideCompletedReceiptView` instead of hardcoded `price * 0.75` math.
6. **Live Notifications Feed** — Replace mock asset loading in `NotificationsDataSourceImpl` with `GET /api/v1/rider/notifications` and `PATCH /api/v1/rider/notifications/:id/read`.
7. **Driver Tipping** — Add tipping sheet/dialog on ride completion calling `POST /api/v1/rides/:id/tip`.
8. **Scheduled Rides** — Add time/calendar picker to booking sheet, calling `POST /api/v1/rides/schedule`, and show scheduled rides in `RideHistoryPage`.
9. **Trusted Contacts UI** — Implement trusted contacts screen with `GET`, `POST`, and `DELETE` on `/api/v1/trusted-contacts`.
10. **Ride Disputes & Lost Items** — Wire `help_page.dart` and past ride cards to submit disputes (`POST /api/v1/ride-disputes`) and report lost items (`POST /api/v1/lost-items/rides/:rideId`).

## Sprint 3 — P2 Polish & Enhancements
11. **Rider Preferences** — Add preferences screen in `settings_page.dart` syncing with `GET` and `PUT` `/api/v1/riders/preferences`.
12. **Nearby Driver Markers** — Stream live driver positions onto the Home screen map using Redis / Socket feed.
13. **Wallet Withdrawal** — Add balance withdrawal request screen for riders.
14. **Ride Details Screen** — Allow clicking past rides in `RideHistoryPage` to view timeline and invoice.

---

# Final Assessment

**The customer app has robust core booking, fare estimation, real-time socket tracking, in-trip chat, and subscriptions (~43% functional coverage).**

However, **it cannot be deployed to production safely without fixing the P0 safety and notification gaps:**
1. The SOS button is an empty stub.
2. FCM is completely absent (no notifications when the phone is locked).
3. The receipt view uses fake math instead of the real backend receipt.
4. Active rides cannot be restored from the backend if local storage is cleared.

*Audit completed: 2026-09-13.*
