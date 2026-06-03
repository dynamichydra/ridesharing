import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../bloc/auth_bloc.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _fadeAnimation = CurvedAnimation(parent: _controller, curve: Curves.easeIn);
    _controller.forward();

    // Trigger startup auth state evaluation
    context.read<AuthBloc>().add(AppStarted());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthAuthenticated) {
          Future.delayed(const Duration(milliseconds: 1500), () {
            if (mounted) context.go('/home');
          });
        } else if (state is AuthUnauthenticated) {
          Future.delayed(const Duration(milliseconds: 1500), () {
            if (mounted) context.go('/onboarding');
          });
        }
      },
      child: Scaffold(
        backgroundColor: Theme.of(context).colorScheme.primary,
        body: Center(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.l),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppRadius.xl),
                  ),
                  child: const Icon(
                    Icons.directions_car_rounded,
                    color: AppColors.primaryBlue,
                    size: 64,
                  ),
                ),
                const SizedBox(height: AppSpacing.l),
                const Text(
                  'Ride Sharing',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: AppSpacing.s),
                Text(
                  'Move with freedom',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white.withOpacity(0.7),
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
