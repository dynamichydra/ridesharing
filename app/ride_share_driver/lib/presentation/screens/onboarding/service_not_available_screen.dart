import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import 'package:material_symbols_icons/symbols.dart';

class ServiceNotAvailableScreen extends StatelessWidget {
  final VoidCallback onRetry;
  final VoidCallback? onNeedHelp;

  const ServiceNotAvailableScreen({
    super.key,
    required this.onRetry,
    this.onNeedHelp,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Background bottom graphic fixed flush to the device screen bottom edge
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Image.asset(
              'assets/images/bottom-no-service.png',
              width: MediaQuery.of(context).size.width,
              fit: BoxFit.fitWidth,
              alignment: Alignment.bottomCenter,
              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
            ),
          ),

          // Main scrollable content inside SafeArea
          SafeArea(
            bottom: false,
            child: SingleChildScrollView(
              padding: EdgeInsets.only(
                left: 24.0,
                right: 24.0,
                bottom: MediaQuery.of(context).padding.bottom + 16,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const SizedBox(height: 20),

                  // Ryva Ride Brand Logo
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Image.asset(
                        'assets/images/ride-share-text-icon.png',
                        height: 38,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.directions_car_rounded,
                              color: AppColors.primary,
                              size: 30,
                            ),
                            SizedBox(width: 8),
                            Text(
                              'Ryva Ride',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0165B7),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 30),

                  // Location Not Accepted Graphic / Illustration
                  Image.asset(
                    'assets/images/no-service.png',
                    height: 210,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => Container(
                      width: 140,
                      height: 140,
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.location_off_rounded,
                        size: 70,
                        color: AppColors.secondary,
                      ),
                    ),
                  ),

                  const SizedBox(height: 28),

                  // Headline
                  const Text(
                    'Service not available\nat your location',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                      height: 1.25,
                      letterSpacing: -0.5,
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Subtitle
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Text(
                      'Sorry, Ryva Ride is not available in your current location. Please move to a serviceable area to go Live.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 15,
                        color: AppColors.textSecondary.withValues(alpha: 0.9),
                        height: 1.4,
                      ),
                    ),
                  ),

                  const SizedBox(height: 28),

                  // Info Card (Driver's Error / Notice)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F7FF),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFD6E8FF)),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Icon(
                          Symbols.info,
                          weight: 200,
                          color: const Color(0xFF0165B7),
                          size: 48,
                        ),

                        const SizedBox(width: 18),

                        SizedBox(
                          height: 55,
                          child: VerticalDivider(
                            color: const Color(0xFF0165B7),
                            thickness: 1,
                            width: 1,
                          ),
                        ),

                        const SizedBox(width: 18),

                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                "Driver's Error",
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'This is not a technical issue. Service is currently unavailable here.',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: const Color(0xFF4A5568),
                                  height: 1.35,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Primary Action Button: View Serviceable Areas / Retry
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: onRetry,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.my_location_rounded,
                            size: 22,
                            color: Colors.white,
                          ),
                          SizedBox(width: 10),
                          Text(
                            'View Serviceable Areas',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(width: 8),
                          Icon(
                            Icons.chevron_right_rounded,
                            size: 22,
                            color: Colors.white,
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Need Help text button
                  TextButton(
                    onPressed: onNeedHelp ?? () {},
                    child: const Text(
                      'Need Help?',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF0165B7),
                      ),
                    ),
                  ),

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
