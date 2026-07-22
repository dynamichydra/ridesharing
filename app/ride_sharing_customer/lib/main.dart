import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:responsive_framework/responsive_framework.dart';
import 'injection_container.dart' as di;
import 'core/theme/app_theme.dart';
import 'core/theme/theme_bloc.dart';
import 'core/services/storage_service.dart';
import 'core/constants/constants.dart';
import 'routes.dart';

// Import Blocs
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/home/presentation/bloc/home_bloc.dart';
import 'features/booking/presentation/bloc/booking_bloc.dart';
import 'features/ride_tracking/presentation/bloc/ride_tracking_bloc.dart';
import 'features/wallet/presentation/bloc/wallet_bloc.dart';
import 'features/notifications/presentation/bloc/notifications_bloc.dart';
import 'features/profile/presentation/bloc/profile_bloc.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await di.init();

  // Set currency code from storage
  final storageService = di.sl<StorageService>();
  final code = storageService.getCountryCode();
  AppConstants.currencySymbol = code == 'CA' ? '\$' : '₹';

  runApp(const MyApp());
}


class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<ThemeBloc>(create: (_) => di.sl<ThemeBloc>()),
        BlocProvider<AuthBloc>(create: (_) => di.sl<AuthBloc>()..add(AppStarted())),
        BlocProvider<HomeBloc>(create: (_) => di.sl<HomeBloc>()),
        BlocProvider<BookingBloc>(create: (_) => di.sl<BookingBloc>()),
        BlocProvider<RideTrackingBloc>(create: (_) => di.sl<RideTrackingBloc>()),
        BlocProvider<WalletBloc>(create: (_) => di.sl<WalletBloc>()),
        BlocProvider<NotificationsBloc>(create: (_) => di.sl<NotificationsBloc>()),
        BlocProvider<ProfileBloc>(create: (_) => di.sl<ProfileBloc>()),
      ],
      child: BlocBuilder<ThemeBloc, ThemeState>(
        builder: (context, themeState) {
          return MaterialApp.router(
            title: 'Ride Sharing Customer',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: themeState.themeMode,
            routerConfig: AppRoutes.router,
            builder: (context, child) => ResponsiveBreakpoints.builder(
              child: child!,
              breakpoints: [
                const Breakpoint(start: 0, end: 450, name: MOBILE),
                const Breakpoint(start: 451, end: 800, name: TABLET),
                const Breakpoint(start: 801, end: 1920, name: DESKTOP),
              ],
            ),
          );
        },
      ),
    );
  }
}
