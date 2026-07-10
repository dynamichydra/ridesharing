import 'package:flutter/material.dart';
import 'style/style.dart';
import 'injection_container.dart' as di;
import 'core/router/app_router.dart';

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
  late final AuthBloc _authBloc;
  late final OnboardingBloc _onboardingBloc;
  late final AppRouter _appRouter;

  @override
  void initState() {
    super.initState();
    _authBloc = di.sl<AuthBloc>()..add(CheckAuthStatus());
    _onboardingBloc = di.sl<OnboardingBloc>();
    _appRouter = AppRouter(_authBloc);
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>.value(value: _authBloc),
        BlocProvider<OnboardingBloc>.value(value: _onboardingBloc),
      ],
      child: MaterialApp.router(
        title: 'Ride Sharing Driver',
        debugShowCheckedModeBanner: false,
        theme: Style().theme,
        routerConfig: _appRouter.router,
      ),
    );
  }
}
