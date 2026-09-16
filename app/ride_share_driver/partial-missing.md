# Driver App: Partial & Missing Features

Consolidated single list of all **PARTIAL** and **MISSING** features from [DRIVER_FEATURE_GAP_AUDIT.md](file:///Users/anis/Desktop/ride-sharing/app/ride_share_driver/DRIVER_FEATURE_GAP_AUDIT.md).

## Remaining Features to Fix / Enhance
| # | Feature | Status | Priority | Backend | Flutter | Notes / Remaining Gap |
|---|---|---|---|---|---|---|
| 2 | **Driver Email Auth** | **MISSING** | **P1** | Yes | No | `POST /auth/driver/email/start|verify` endpoint exists; email OTP UI tab optional. |

---

## Completed Features
| # | Feature | Status | Priority | Backend | Flutter | Notes / Resolution |
|---|---|---|---|---|---|---|
| 9 | **Driver Profile Update Sync** | **COMPLETE** | **P1** | Yes | Yes | Profile editing enabled; profile text fields & profile photo update via `PATCH /drivers/profile` & `POST /drivers/profile-photo`. |
| 6 | **Device Sessions Management** | **COMPLETE** | **P2** | Yes | Yes | `GET /auth/devices` & `DELETE /auth/devices/:id` wired with `DeviceManagementScreen` for active session viewing and remote revocation. |
| 7 | **FCM Token Registration** | **COMPLETE** | **P0** | Yes | Yes | `FcmService` automatically syncs FCM tokens via `PATCH /drivers/fcm-token` upon login. |
| 12 | **Preferred Language Sync** | **COMPLETE** | **P2** | Yes | Yes | App language selector in Settings saves preference locally and syncs `preferred_language` to `PATCH /drivers/profile`. |
| 17 | **Document Upload (Driver Docs)** | **COMPLETE** | **P0** | Yes | Yes | Dynamic requirements wired via `/onboarding/config`, checklist marks optional docs, dynamic config reloaded on step success. |
| 18 | **Document Status / Renewal** | **COMPLETE** | **P1** | Yes | Yes | Dedicated `/documents` screen with status badges, expiry warnings, client-side expiration checks, renewal re-upload flow. |
| 20 | **Vehicle Activate** | **COMPLETE** | **P1** | Yes | Yes | `POST /vehicles/:id/activate` wired with `VehicleManagementScreen` allowing drivers to manage & switch active driving vehicle. |
| 21, 22 | **Vehicle Delete & Inspections** | **COMPLETE** | **P2** | Yes | Yes | `DELETE /vehicles/:id` & `GET /vehicles/:id/inspections` integrated into `VehicleManagementScreen`. |
| 35 | **No-Show Declaration** | **COMPLETE** | **P0** | Yes | Yes | `POST /rides/:id/no-show` wired with `DriverNoShowRequested`, cancellation dialog, and completion sheet UI. |
| 41 | **Chat Shortcut on Active Ride** | **COMPLETE** | **P1** | Yes | Yes | Floating chat action button over map on `ActiveRideScreen` for 1-tap navigation to `RideChatPage`. |
| 42 | **In-Trip Chat History (REST)** | **COMPLETE** | **P2** | Yes | Yes | `GET /rides/:id/messages` integrated into `RideChatPage` for hydrating historical messages on load. |
| 43 | **Lost Item Report & History** | **COMPLETE** | **P2** | Yes | Yes | `POST /lost-items/rides/:rideId` & `GET /lost-items/mine` wired with `ReportLostItemDialog` and `LostItemsPage`. |
| 44 | **Ride Receipt (Driver)** | **COMPLETE** | **P1** | Yes | Yes | `GET /rides/:id/receipt` wired with `RideReceiptSheet` rendering fare itemization and promo subsidy. |
| 45 | **Ride History Details & Pagination** | **COMPLETE** | **P1** | Yes | Yes | Infinite scroll pagination active; added Ride Details Bottom Sheet with receipt, dispute, and lost item actions upon card tap. |
| 46 | **Dashboard Summary** | **COMPLETE** | **P1** | Yes | Yes | Real-time metrics sourced from `GET /api/v1/drivers/dashboard-summary` into `ProfileBloc`. |
| 47 | **Driver Earnings** | **COMPLETE** | **P1** | Yes | Yes | Wired `GET /api/v1/drivers/earnings` with daily/weekly/monthly periods & savings annotations. |
| 48 | **Commission Status** | **COMPLETE** | **P1** | Yes | Yes | `GET /api/v1/drivers/commission-status` card in Earnings & settlement notes in Wallet. |
| 49, 50 | **Wallet Frozen Banner & Pagination** | **COMPLETE** | **P1** | Yes | Yes | Balance & transactions display; added red Wallet Frozen / Restricted warning banner and transaction history. |
| 52 | **Instant Payout Pre-Check** | **COMPLETE** | **P0** | Yes | Yes | Bank payout account verification pre-check before opening cash-out modal; redirects to document upload if missing. |
| 53 | **Payout History** | **COMPLETE** | **P1** | Yes | Yes | `GET /api/v1/payouts/mine` wired with `PayoutHistoryPage` and transaction receipts. |
| 56 | **Subscription Status Lifecycle** | **COMPLETE** | **P0** | Yes | Yes | Added lifecycle alert banners for `past_due`, `paused`, and `payment_failed` statuses on `DriverDashboard`. |
| 57 | **Subscription History** | **COMPLETE** | **P2** | Yes | Yes | `GET /subscriptions/history` wired with `SubscriptionHistoryPage`. |
| 58,59,60 | **Incentives & Bonus Quests** | **COMPLETE** | **P1** | Yes | Yes | `GET /drivers/incentives/progress` and `POST /claim` integrated into `EarningsPage` via `ActiveIncentiveQuestsSection`. |
| 61 | **Driver Performance Metrics** | **COMPLETE** | **P2** | Yes | Yes | `GET /drivers/performance` wired with `DriverPerformanceCard` in Profile/Dashboard. |
| 62 | **Heatmap / Demand Zones** | **COMPLETE** | **P2** | Yes | Yes | `GET /drivers/heatmap` integrated into `DriverMapView` rendering surge circles on Google Maps. |
| 63 | **SOS Alert (Driver)** | **COMPLETE** | **P0** | Yes | Yes | `POST /rides/:rideId/sos` wired with BLoC event `DriverSosRequested` and emergency trigger button on `ActiveRideScreen`. |
| 64 | **Emergency Trip Share Token** | **COMPLETE** | **P1** | Yes | Yes | `POST /rides/:rideId/share-token` enabled; live trip status share button added to safety menu on `ActiveRideScreen`. |
| 65,66 | **Ride Disputes (Raise & List)** | **COMPLETE** | **P1** | Yes | Yes | `POST /ride-disputes` & `GET /ride-disputes/mine` wired with `RaiseDisputeDialog` and `DisputesPage`. |
| 67 | **Cash Collection Reporting** | **COMPLETE** | **P1** | Yes | Yes | `POST /ride-payments/:rideId/cash-collect` wired with `CashCollectionDialog` upon completing cash rides. |
| 68 | **Push Notifications (FCM Handling)** | **COMPLETE** | **P0** | Yes | Yes | Background & foreground FCM payload handlers and local notification banners active. |

---

*(Note: Features with broken endpoints in the audit (#23 Payout Account Setup [P0] and #51 Wallet Top-Up [P1]) are classified as **INCORRECT** and require endpoint fixes).*