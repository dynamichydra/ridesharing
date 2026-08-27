import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../presentation/screens/onboarding/onboarding_wizard.dart';
import '../../presentation/screens/dashboard/driver_dashboard.dart';
import '../../presentation/screens/dashboard/driver_main_layout.dart';
import '../../presentation/screens/settings/settings_page.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/subscription/presentation/screens/subscription_plans_screen.dart';
import '../../features/ride_history/presentation/pages/ride_history_page.dart';
import '../../features/ride_history/presentation/pages/ride_details_page.dart';
import '../../features/earnings/presentation/pages/earnings_page.dart';
import '../../features/wallet/presentation/pages/wallet_page.dart';
import '../../features/wallet/presentation/pages/transactions_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/profile/presentation/pages/vehicle_info_page.dart';
import '../../features/profile/presentation/pages/driver_documents_page.dart';
import '../../features/ride/presentation/screens/active_ride_screen.dart';

class AppRouter {
  final AuthBloc authBloc;

  AppRouter(this.authBloc);

  static final GlobalKey<NavigatorState> _rootNavigatorKey =
      GlobalKey<NavigatorState>(debugLabel: 'driver_root');

  late final GoRouter router = GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    refreshListenable: _BlocRefreshListenable(authBloc),
    redirect: (context, state) {
      final authState = authBloc.state;
      final isOnboarding = state.matchedLocation == '/onboarding';

      if (authState is Authenticated) {
        final isFullyApproved = authState.driver.isApproved;

        if (!isFullyApproved) {
          if (!isOnboarding) return '/onboarding';
          return null;
        }

        if (isOnboarding || state.matchedLocation == '/' || state.matchedLocation == '/subscription') {
          return '/dashboard';
        }
      } else if (authState is Unauthenticated) {
        if (!isOnboarding) {
          return '/onboarding';
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/onboarding',
        builder: (context, state) => OnboardingWizard(
          onComplete: () {
            context.go('/dashboard');
          },
        ),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/subscription',
        builder: (context, state) {
          final authState = authBloc.state;
          final countryId = authState is Authenticated ? (authState.driver.countryId ?? '') : '';
          return SubscriptionPlansScreen(
            countryId: countryId,
            onSubscribed: () {},
            onLogout: () {
              authBloc.add(LogoutRequested());
            },
          );
        },
      ),

      // StatefulShellRoute.indexedStack preserves all 5 main index tabs in memory without recreating/reloading them
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return DriverMainLayout(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/dashboard',
                builder: (context, state) => DriverDashboard(
                  onLogout: () {
                    authBloc.add(LogoutRequested());
                  },
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/ride-history',
                builder: (context, state) => const RideHistoryPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/earnings',
                builder: (context, state) => const EarningsPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/wallet',
                builder: (context, state) => const WalletPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfilePage(),
              ),
            ],
          ),
        ],
      ),

      // Full-screen pages
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/active-ride',
        builder: (context, state) => const ActiveRidePage(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/ride-details',
        builder: (context, state) {
          final rideData = state.extra as Map<String, dynamic>?;
          return RideDetailsPage(rideData: rideData);
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/transactions',
        builder: (context, state) => const TransactionsPage(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/vehicle-info',
        builder: (context, state) => const VehicleInfoPage(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/documents',
        builder: (context, state) => const DriverDocumentsPage(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/settings',
        builder: (context, state) {
          final authState = authBloc.state;
          final driver = authState is Authenticated ? authState.driver : null;
          return SettingsPage(
            driver: driver,
            onLogout: () {
              authBloc.add(LogoutRequested());
            },
          );
        },
      ),
    ],
  );
}

class _BlocRefreshListenable extends ChangeNotifier {
  final AuthBloc bloc;
  late final dynamic _subscription;

  _BlocRefreshListenable(this.bloc) {
    _subscription = bloc.stream.listen((_) {
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
