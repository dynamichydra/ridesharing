import 'package:go_router/go_router.dart';
import 'core/services/storage_service.dart';
import 'injection_container.dart';

// Import Pages
import 'features/home/presentation/pages/main_layout.dart';
import 'features/auth/presentation/pages/splash_page.dart';
import 'features/auth/presentation/pages/onboarding_page.dart';
import 'features/auth/presentation/pages/login_page.dart';
import 'features/auth/presentation/pages/signup_page.dart';
import 'features/auth/presentation/pages/otp_page.dart';
import 'features/auth/presentation/pages/forgot_password_page.dart';
import 'features/home/presentation/pages/home_page.dart';
import 'features/booking/presentation/pages/select_location_page.dart';
import 'features/booking/presentation/pages/ride_options_page.dart';
import 'features/ride_tracking/presentation/pages/ride_tracking_page.dart';
import 'features/wallet/presentation/pages/wallet_page.dart';
import 'features/wallet/presentation/pages/add_funds_page.dart';
import 'features/notifications/presentation/pages/notifications_page.dart';
import 'features/profile/presentation/pages/profile_page.dart';
import 'features/profile/presentation/pages/edit_profile_page.dart';
import 'features/profile/presentation/pages/saved_places_page.dart';
import 'features/profile/presentation/pages/payment_methods_page.dart';
import 'features/profile/presentation/pages/help_page.dart';
import 'features/profile/presentation/pages/settings_page.dart';
import 'features/profile/presentation/pages/ride_history_page.dart';
import 'features/profile/presentation/pages/ride_detail_page.dart';
import 'features/wallet/presentation/pages/transactions_page.dart';

class AppRoutes {
  static const String splash = '/';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String signup = '/signup';
  static const String otp = '/otp';
  static const String forgotPassword = '/forgot-password';
  static const String home = '/home';
  static const String selectLocation = '/select-location';
  static const String rideOptions = '/ride-options';
  static const String rideTracking = '/ride-tracking';
  static const String wallet = '/wallet';
  static const String addFunds = '/add-funds';
  static const String notifications = '/notifications';
  static const String profile = '/profile';
  static const String editProfile = '/edit-profile';
  static const String savedPlaces = '/saved-places';
  static const String paymentMethods = '/payment-methods';
  static const String help = '/help';
  static const String settings = '/settings';
  static const String rideHistory = '/ride-history';
  static const String rideDetail = '/ride-detail';
  static const String transactions = '/transactions';

  static final GoRouter router = GoRouter(
    initialLocation: splash,
    redirect: (context, state) async {
      final storage = sl<StorageService>();
      final token = await storage.getToken();
      final isLoggedIn = token != null;

      final authPaths = [login, signup, forgotPassword, otp, onboarding, splash];
      final isGoingToAuth = authPaths.contains(state.matchedLocation);

      if (!isLoggedIn && !isGoingToAuth) {
        return login;
      }
      if (isLoggedIn && isGoingToAuth && state.matchedLocation != splash && state.matchedLocation != signup && state.matchedLocation != onboarding) {
        return home;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: splash,
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: onboarding,
        builder: (context, state) => const OnboardingPage(),
      ),
      GoRoute(
        path: login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: signup,
        builder: (context, state) => const SignupPage(),
      ),
      GoRoute(
        path: otp,
        builder: (context, state) {
          final phone = state.extra as String? ?? '';
          return OtpPage(phoneNumber: phone);
        },
      ),
      GoRoute(
        path: forgotPassword,
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      ShellRoute(
        builder: (context, state, child) {
          return MainLayout(child: child);
        },
        routes: [
          GoRoute(
            path: home,
            builder: (context, state) => const HomePage(),
          ),
          GoRoute(
            path: rideHistory,
            builder: (context, state) => const RideHistoryPage(),
          ),
          GoRoute(
            path: wallet,
            builder: (context, state) => const WalletPage(),
          ),
          GoRoute(
            path: profile,
            builder: (context, state) => const ProfilePage(),
          ),
        ],
      ),
      GoRoute(
        path: selectLocation,
        builder: (context, state) => const SelectLocationPage(),
      ),
      GoRoute(
        path: rideOptions,
        builder: (context, state) => const RideOptionsPage(),
      ),
      GoRoute(
        path: rideTracking,
        builder: (context, state) => const RideTrackingPage(),
      ),
      GoRoute(
        path: notifications,
        builder: (context, state) => const NotificationsPage(),
      ),
    ],
  );
}
