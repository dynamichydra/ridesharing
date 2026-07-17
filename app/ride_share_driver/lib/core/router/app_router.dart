import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../presentation/screens/onboarding/onboarding_wizard.dart';
import '../../presentation/screens/dashboard/driver_dashboard.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/subscription/presentation/screens/subscription_plans_screen.dart';

class AppRouter {
  final AuthBloc authBloc;

  AppRouter(this.authBloc);

  late final GoRouter router = GoRouter(
    initialLocation: '/',
    refreshListenable: _BlocRefreshListenable(authBloc),
    redirect: (context, state) {
      final authState = authBloc.state;
      final isOnboarding = state.matchedLocation == '/onboarding';

      if (authState is Authenticated) {
        final isFullyApproved = authState.driver.registrationStatus == 'approved' ||
                                authState.driver.registrationStatus == 'active';

        if (!isFullyApproved) {
          // If not approved yet, they must complete onboarding
          if (!isOnboarding) return '/onboarding';
          return null;
        }

        // Approved, but one more gate before the dashboard: an active
        // subscription (backend enforces the same gate on go-online).
        if (!authState.driver.hasActiveSubscription) {
          if (state.matchedLocation != '/subscription') return '/subscription';
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
        path: '/onboarding',
        builder: (context, state) => OnboardingWizard(
          onComplete: () {
            context.go('/dashboard');
          },
        ),
      ),
      GoRoute(
        path: '/subscription',
        builder: (context, state) {
          final authState = authBloc.state;
          final countryId = authState is Authenticated ? (authState.driver.countryId ?? '') : '';
          return SubscriptionPlansScreen(
            countryId: countryId,
            // No explicit navigation here: PurchaseSucceeded already triggers
            // AuthBloc.CheckAuthStatus() to refresh the driver profile, and
            // `redirect` above reacts to that once hasActiveSubscription
            // flips true. Navigating here directly would race ahead of that
            // refresh and could bounce straight back to `/subscription`.
            onSubscribed: () {},
            onLogout: () {
              authBloc.add(LogoutRequested());
            },
          );
        },
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => DriverDashboard(
          onLogout: () {
            authBloc.add(LogoutRequested());
          },
        ),
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
