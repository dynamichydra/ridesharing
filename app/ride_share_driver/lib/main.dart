import 'package:flutter/material.dart';
import 'style/style.dart';
import 'presentation/screens/onboarding_wizard.dart';
import 'driver_dashboard.dart';
import 'injection_container.dart' as di;

import 'package:flutter_bloc/flutter_bloc.dart';
import 'presentation/bloc/auth/auth_bloc.dart';
import 'presentation/bloc/onboarding/onboarding_bloc.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await di.init();
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  bool _isRegistered = false;

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(create: (_) => di.sl<AuthBloc>()..add(CheckAuthStatus())),
        BlocProvider<OnboardingBloc>(create: (_) => di.sl<OnboardingBloc>()),
      ],
      child: MaterialApp(
        title: 'Ride Sharing Driver',
        debugShowCheckedModeBanner: false,
        theme: Style().theme,
        home: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, authState) {
            if (authState is Authenticated) {
              final isFullyApproved = authState.driver.registrationStatus == 'approved';
              if (isFullyApproved || _isRegistered) {
                return DriverDashboard(
                  onLogout: () {
                    context.read<AuthBloc>().add(LogoutRequested(deviceId: 'driver_emulator'));
                  },
                );
              }
              return OnboardingWizard(
                onComplete: () {
                  setState(() {
                    _isRegistered = true;
                  });
                },
              );
            }
            return OnboardingWizard(
              onComplete: () {
                setState(() {
                  _isRegistered = true;
                });
              },
            );
          },
        ),
      ),
    );
  }
}
