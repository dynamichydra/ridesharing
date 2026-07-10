import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../presentation/screens/onboarding/onboarding_wizard.dart';
import '../../presentation/screens/dashboard/driver_dashboard.dart';
import '../../presentation/bloc/auth/auth_bloc.dart';

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
        final isFullyApproved = authState.driver.registrationStatus == 'approved';
        if (isFullyApproved) {
          if (isOnboarding || state.matchedLocation == '/') {
            return '/dashboard';
          }
        } else {
          // If not approved yet, they must complete onboarding
          if (!isOnboarding) {
            return '/onboarding';
          }
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
        path: '/dashboard',
        builder: (context, state) => DriverDashboard(
          onLogout: () {
            authBloc.add(LogoutRequested(deviceId: 'driver_emulator'));
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
