# Customer Ride-Booking MVP App

A production-ready Flutter customer ride-booking MVP prototype inspired by modern ride-sharing apps like Lyft. It is built using **Clean Architecture**, **BLoC State Management**, and **feature-first** patterns.

---

## 🛠️ Technology Stack & Dependencies

*   **Framework**: [Flutter Latest Stable (3.41.2)](https://flutter.dev)
*   **State Management**: [flutter_bloc](https://pub.dev/packages/flutter_bloc)
*   **Routing**: [go_router](https://pub.dev/packages/go_router)
*   **Dependency Injection**: [get_it](https://pub.dev/packages/get_it)
*   **Network Client**: [dio](https://pub.dev/packages/dio)
*   **Local Caching & Storage**: [hive](https://pub.dev/packages/hive) & [flutter_secure_storage](https://pub.dev/packages/flutter_secure_storage)
*   **Map Integrations**: [google_maps_flutter](https://pub.dev/packages/google_maps_flutter)
*   **Device Helpers**: [geolocator](https://pub.dev/packages/geolocator) & [permission_handler](https://pub.dev/packages/permission_handler)
*   **Layout Utilities**: [responsive_framework](https://pub.dev/packages/responsive_framework) & [shimmer](https://pub.dev/packages/shimmer)
*   **Miscellaneous**: `equatable`, `intl`, `logger`, `connectivity_plus`

---

## 🏗️ Clean Architecture Structure

The project strictly adheres to Clean Architecture and SOLID principles, structured in a **feature-first** layout:

```
lib/
├── core/
│   ├── constants/       # Global colors, spacing, radius, and mock assets
│   ├── theme/           # AppTheme configuration (Light/Dark themes) and ThemeBloc
│   ├── errors/          # Custom failures (ServerFailure, LocationFailure)
│   ├── utils/           # Location helper (bearing, distance, path generation)
│   ├── network/         # Dio client wrapper loading local mock JSONs
│   ├── services/        # StorageService (Hive & FlutterSecureStorage)
│   └── widgets/         # Reusable widgets (CustomButton, CustomTextField, loaders, AppMapView)
├── features/
│   ├── auth/            # Auth pages (Splash, Onboarding, Login, Signup, OTP, Forgot) & logic
│   ├── home/            # HomePage (search drawers, suggestion cards, map viewport)
│   ├── booking/         # Location picker & vehicle options (Economy, Standard, Premium, XL)
│   ├── ride_tracking/   # Active driver tracking & movement step simulators
│   ├── wallet/          # Account balances, top-upPresets, and transaction list
│   ├── profile/         # Settings panel, saved places editor, support page, & ride history list
│   └── notifications/   # System alerts, inbox, and receipts
├── injection_container.dart # GetIt dependency injection registry
├── routes.dart          # Central GoRouter routing maps & auth guards
└── main.dart            # Flutter app initialization
```

---

## 📍 Stunning Mock Map Behavior

To guarantee a flawless demonstration out-of-the-box on all devices (emulators, simulators, or web without Google API Keys), we built a dual-mode map interface:
*   **Mock Vector Canvas Mode (Default)**: Projects real GPS coordinates (latitude/longitude) linearly onto a 1200x1200px canvas drawn with streets, rivers, and parks. Calculates bearings to rotate the driver car icon, and runs a periodic timer to animate vehicles along route lines.
*   **Google Maps Mode**: Can be toggled inside `lib/core/widgets/app_map_view.dart` for direct SDK integration.

---

## 💾 Mock Data Layer & Caching

The application doesn't connect to any real backend. Instead:
1.  All data is populated from mock JSON templates under `assets/mock/` (`users.json`, `vehicles.json`, `ride_history.json`, `notifications.json`, `wallet.json`).
2.  Persistent changes (such as wallet top-ups, profile name changes, marking notifications as read, and deleting saved places) are cached inside a **Hive** database and **Flutter Secure Storage** (for tokens) during runtime, ensuring states are preserved when switching screens.

---

## 🚀 Running the App

### 1. Download Dependencies
```bash
flutter pub get
```

### 2. Run the App
```bash
flutter run
```

### 3. Run Automated Test Suite
Includes Bloc state machines and repository mathematical tests:
```bash
flutter test
```

---

## 🔑 Demo Credentials
*   **Email**: `alex.morgan@example.com`
*   **Password**: `password123`
*   **Verification OTP Code**: `123456`
