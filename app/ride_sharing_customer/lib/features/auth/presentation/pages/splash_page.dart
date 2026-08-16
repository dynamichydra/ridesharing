import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../../injection_container.dart';
import '../../../../core/services/storage_service.dart';
import '../../../ride_tracking/presentation/bloc/ride_tracking_bloc.dart';
import '../bloc/auth_bloc.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  bool _isPermissionGranted = false;
  AuthState? _pendingState;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _fadeAnimation = CurvedAnimation(parent: _controller, curve: Curves.easeIn);
    _controller.forward();

    _requestLocationPermission();

    // Trigger startup auth state evaluation
    context.read<AuthBloc>().add(AppStarted());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_isPermissionGranted) {
      _requestLocationPermission();
    }
  }

  Future<void> _requestLocationPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.deniedForever) {
      await openAppSettings();
      permission = await Geolocator.checkPermission();
    }

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      await Geolocator.openLocationSettings();
      serviceEnabled = await Geolocator.isLocationServiceEnabled();
    }

    if ((permission == LocationPermission.always || permission == LocationPermission.whileInUse) && serviceEnabled) {
      setState(() {
        _isPermissionGranted = true;
      });
      _navigateIfReady();
    } else {
      if (mounted) {
        context.go('/location-permission', extra: () {
          if (mounted) {
            _requestLocationPermission();
          }
        });
      }
    }
  }

  void _navigateIfReady() {
    if (!_isPermissionGranted || _pendingState == null) return;

    if (_pendingState is AuthAuthenticated) {
      Future.delayed(const Duration(milliseconds: 1000), () {
        if (!mounted) return;
        final storage = sl<StorageService>();
        final activeRide = storage.getCachedData('active_ride_tracking');
        if (activeRide != null) {
          context.read<RideTrackingBloc>().add(RestoreActiveRide());
          context.go('/ride-tracking');
        } else {
          context.go('/home');
        }
      });
    } else if (_pendingState is AuthUnauthenticated) {
      Future.delayed(const Duration(milliseconds: 1000), () {
        if (mounted) context.go('/login');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        _pendingState = state;
        _navigateIfReady();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Stack(
            children: [
              // Main logo centered
              Center(
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: Image.asset(
                    'assets/logos/main-logo-full.png',
                    width: MediaQuery.of(context).size.width * 0.75,
                    fit: BoxFit.contain,
                  ),
                ),
              ),

              // Bottom 3-Dot Loading Indicator
              Positioned(
                bottom: 40,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: Color(0xFF009048),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: Color(0xFF0065B3),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: Color(0xFFE5B800),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
