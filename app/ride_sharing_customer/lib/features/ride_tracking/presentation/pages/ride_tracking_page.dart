import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/utils/location_helper.dart';
import '../../../../core/widgets/app_map_view.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../../../../core/widgets/loading_view.dart';
import '../bloc/ride_tracking_bloc.dart';
import '../../../booking/presentation/bloc/booking_bloc.dart';
import '../../../wallet/presentation/bloc/wallet_bloc.dart';
import '../../../profile/presentation/bloc/profile_bloc.dart';
import '../../../../injection_container.dart';
import '../../../../core/network/dio_client.dart';

class RideTrackingPage extends StatefulWidget {
  const RideTrackingPage({super.key});

  @override
  State<RideTrackingPage> createState() => _RideTrackingPageState();
}

class _RideTrackingPageState extends State<RideTrackingPage> with SingleTickerProviderStateMixin {
  int _selectedRating = 5;
  final TextEditingController _commentController = TextEditingController();
  bool _isSubmittingRating = false;
  bool _showThankYou = false;

  late AnimationController _radarController;

  @override
  void initState() {
    super.initState();
    _radarController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();
  }

  @override
  void dispose() {
    _radarController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_showThankYou) {
      return _buildThankYouView(context);
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: BlocConsumer<RideTrackingBloc, RideTrackingState>(
        listener: (context, state) {
          if (state is RideTrackingCancelled) {
            CustomToast.show(context, state.message);
            context.read<BookingBloc>().add(ClearBooking());
            context.go('/home');
          } else if (state is RideTrackingActive && state.trackingState == 'rideCompleted') {
            context.read<WalletBloc>().add(LoadWalletDetails());
            context.read<ProfileBloc>().add(LoadProfile());
          }
        },
        builder: (context, state) {
          // Screen 4: Connecting you to the driver
          if (state is RideTrackingSearching) {
            return _buildConnectingDriverView(context, state);
          }

          if (state is RideTrackingLoading) {
            return const LoadingView();
          }

          if (state is RideTrackingActive) {
            switch (state.trackingState) {
              case 'driverAccepted':
                return _buildDriverAcceptedView(context, state);
              case 'driverArriving':
                return _buildDriverEnRouteView(context, state);
              case 'driverArrived':
              case 'otpVerification':
                return _buildDriverArrivedOtpView(context, state);
              case 'rideInProgress':
                return _buildInRideView(context, state);
              case 'rideCompleted':
                return _buildRideCompletedReceiptView(context, state);
              default:
                return _buildDriverAcceptedView(context, state);
            }
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  // ===========================================================================
  // Screen 4: Connecting you to the driver (Map Radar Animation)
  // ===========================================================================
  Widget _buildConnectingDriverView(BuildContext context, RideTrackingSearching state) {
    return Stack(
      children: [
        // 1. Zoomed out Map View with pickup in center and geographic radar pulse
        Positioned.fill(
          child: AppMapView(
            pickup: state.pickup,
            destination: state.destination,
            routePoints: state.routePoints,
            driverVehicleType: state.vehicleName,
            showPickupPulse: true,
            initialZoom: 14.0,
          ),
        ),

        // 3. Floating Top Header
        Positioned(
          top: MediaQuery.of(context).padding.top + 8,
          left: 16,
          right: 16,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF021B47)),
                  onPressed: () => context.go('/home'),
                ),
                const Expanded(
                  child: Column(
                    children: [
                      Text(
                        'Connecting you to the driver',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF021B47),
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Please wait a moment',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF8A94A6),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 36),
              ],
            ),
          ),
        ),

        // 4. Bottom Card with circular spinner & Cancel Ride
        Positioned(
          bottom: 24,
          left: 16,
          right: 16,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF021B47).withValues(alpha: 0.10),
                  blurRadius: 18,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Row(
                  children: [
                    SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(
                        color: Color(0xFF009048),
                        strokeWidth: 3,
                      ),
                    ),
                    SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Searching for the best driver',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF021B47),
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'This may take a few seconds',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF8A94A6),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 10),

                // Cancel Ride Button
                GestureDetector(
                  onTap: () => _showCancelConfirmationDialog(context),
                  child: const Text(
                    'Cancel Ride',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFE53935),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // Screen 5: Driver Accepted
  // ===========================================================================
  Widget _buildDriverAcceptedView(BuildContext context, RideTrackingActive state) {
    final spacedOtp = state.otp.padLeft(4, '0').split('').join('  ');

    final distanceKm = LocationHelper.calculateDistance(
      state.driverPosition.latitude,
      state.driverPosition.longitude,
      state.pickup.latitude,
      state.pickup.longitude,
    );
    final distanceStr = distanceKm < 1.0
        ? '${(distanceKm * 1000).round()} m'
        : '${distanceKm.toStringAsFixed(1)} km';
    final etaMins = max(1, (distanceKm / 25 * 60).round());
    final etaStr = '$etaMins min';

    return Stack(
      children: [
        // 1. Live Map View: shows driver coming to pickup location
        Positioned.fill(
          child: AppMapView(
            pickup: state.pickup,
            destination: null, // Only show pickup when driver is approaching
            driverPosition: state.driverPosition,
            driverBearing: state.driverBearing,
            routePoints: state.routePoints,
            driverVehicleType: state.vehicleName,
          ),
        ),

        // 2. Floating Top Header
        Positioned(
          top: MediaQuery.of(context).padding.top + 8,
          left: 16,
          right: 16,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF021B47)),
                  onPressed: () => context.go('/home'),
                ),
                const Expanded(
                  child: Column(
                    children: [
                      Text(
                        'Driver Accepted',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF009048),
                          fontSize: 16,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Your driver is on the way',
                        style: TextStyle(
                          color: Color(0xFF535E79),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 36),
              ],
            ),
          ),
        ),

        // 3. Bottom Card
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(28),
                topRight: Radius.circular(28),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 16,
                  offset: Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Driver Profile Row
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 22,
                      backgroundColor: Color(0xFFF1F5F9),
                      child: Icon(Icons.person, color: Color(0xFF021B47), size: 26),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                state.driverName,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                              ),
                              const SizedBox(width: 6),
                              const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                              Text(
                                ' ${state.driverRating.toStringAsFixed(1)}',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF535E79)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(state.driverVehicle, style: const TextStyle(fontSize: 12, color: Color(0xFF8A94A6))),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Distance & ETA Row
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7F9FC),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildPillItem(distanceStr, 'away'),
                      _buildPillDivider(),
                      _buildPillItem(etaStr, 'away'),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Large Spaced Ride OTP
                const Text(
                  'Ride OTP',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF8A94A6)),
                ),
                const SizedBox(height: 4),
                Text(
                  spacedOtp,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 4,
                    color: Color(0xFF009048),
                  ),
                ),
                const SizedBox(height: 2),
                const Text(
                  'Share this OTP with your driver',
                  style: TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                ),
                const SizedBox(height: 14),
                const Divider(),
                const SizedBox(height: 8),

                // Cancel Ride Button
                GestureDetector(
                  onTap: () => _showCancelConfirmationDialog(context),
                  child: const Text(
                    'Cancel Ride',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFE53935),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // Screen 6: Driver on the way (En Route)
  // ===========================================================================
  Widget _buildDriverEnRouteView(BuildContext context, RideTrackingActive state) {
    final spacedOtp = state.otp.padLeft(4, '0').split('').join('  ');

    final distanceKm = LocationHelper.calculateDistance(
      state.driverPosition.latitude,
      state.driverPosition.longitude,
      state.pickup.latitude,
      state.pickup.longitude,
    );
    final distanceStr = distanceKm < 1.0
        ? '${(distanceKm * 1000).round()} m'
        : '${distanceKm.toStringAsFixed(1)} km';
    final etaMins = max(1, (distanceKm / 25 * 60).round());
    final etaStr = '$etaMins min';

    return Stack(
      children: [
        // 1. Live Map View: shows driver coming to pickup location
        Positioned.fill(
          child: AppMapView(
            pickup: state.pickup,
            destination: null, // Only show pickup when driver is approaching
            driverPosition: state.driverPosition,
            driverBearing: state.driverBearing,
            routePoints: state.routePoints,
            driverVehicleType: state.vehicleName,
          ),
        ),

        // 2. Floating Top Header
        Positioned(
          top: MediaQuery.of(context).padding.top + 8,
          left: 16,
          right: 16,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF021B47)),
                  onPressed: () => context.go('/home'),
                ),
                const Expanded(
                  child: Column(
                    children: [
                      Text(
                        'Driver on the way',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF009048),
                          fontSize: 16,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Your driver is coming to pickup',
                        style: TextStyle(
                          color: Color(0xFF535E79),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 36),
              ],
            ),
          ),
        ),

        // 3. Bottom Card
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(28),
                topRight: Radius.circular(28),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 16,
                  offset: Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 22,
                      backgroundColor: Color(0xFFF1F5F9),
                      child: Icon(Icons.person, color: Color(0xFF021B47), size: 26),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                state.driverName,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                              ),
                              const SizedBox(width: 6),
                              const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                              Text(
                                ' ${state.driverRating.toStringAsFixed(1)}',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF535E79)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(state.driverVehicle, style: const TextStyle(fontSize: 12, color: Color(0xFF8A94A6))),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                Container(
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7F9FC),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildPillItem(distanceStr, 'away'),
                      _buildPillDivider(),
                      _buildPillItem(etaStr, 'away'),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                const Text(
                  'Ride OTP',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF8A94A6)),
                ),
                const SizedBox(height: 4),
                Text(
                  spacedOtp,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 4,
                    color: Color(0xFF009048),
                  ),
                ),
                const SizedBox(height: 2),
                const Text(
                  'Share this OTP with your driver',
                  style: TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                ),
                const SizedBox(height: 14),
                const Divider(),
                const SizedBox(height: 8),

                GestureDetector(
                  onTap: () => _showCancelConfirmationDialog(context),
                  child: const Text(
                    'Cancel Ride',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFE53935),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // Screen 7: Driver Arrived (OTP Boxes)
  // ===========================================================================
  Widget _buildDriverArrivedOtpView(BuildContext context, RideTrackingActive state) {
    final digits = state.otp.padLeft(4, '0').split('');
    final spacedOtp = digits.join('  ');

    return Stack(
      children: [
        // 1. Live Map View: driver has arrived at pickup location
        Positioned.fill(
          child: AppMapView(
            pickup: state.pickup,
            destination: null, // Keep destination hidden until OTP verified and ride starts
            driverPosition: state.pickup,
            driverBearing: 0,
            routePoints: const [],
            driverVehicleType: state.vehicleName,
          ),
        ),

        // 2. Floating Top Header
        Positioned(
          top: MediaQuery.of(context).padding.top + 8,
          left: 16,
          right: 16,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF021B47)),
                  onPressed: () => context.go('/home'),
                ),
                const Expanded(
                  child: Column(
                    children: [
                      Text(
                        'Driver has arrived',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF009048),
                          fontSize: 16,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Please meet your driver',
                        style: TextStyle(
                          color: Color(0xFF535E79),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 36),
              ],
            ),
          ),
        ),

        // 3. Bottom Card
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(28),
                topRight: Radius.circular(28),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 16,
                  offset: Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 22,
                      backgroundColor: Color(0xFFF1F5F9),
                      child: Icon(Icons.person, color: Color(0xFF021B47), size: 26),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                state.driverName,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                              ),
                              const SizedBox(width: 6),
                              const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                              Text(
                                ' ${state.driverRating.toStringAsFixed(1)}',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF535E79)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(state.driverVehicle, style: const TextStyle(fontSize: 12, color: Color(0xFF8A94A6))),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                const Text(
                  'Ride OTP',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF8A94A6)),
                ),
                const SizedBox(height: 4),
                Text(
                  spacedOtp,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 4,
                    color: Color(0xFF009048),
                  ),
                ),
                const SizedBox(height: 2),
                const Text(
                  'Share this OTP with your driver',
                  style: TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                ),
                const SizedBox(height: 14),

                // 4 Large Digit Boxes
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: digits.map((d) {
                    return Container(
                      margin: const EdgeInsets.symmetric(horizontal: 6),
                      width: 52,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E7E9), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          d,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF021B47),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 8),

                GestureDetector(
                  onTap: () => _showCancelConfirmationDialog(context),
                  child: const Text(
                    'Cancel Ride',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFE53935),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Bottom Blue Safety Pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEBF5FF),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.info_outline_rounded, color: Color(0xFF0065B3), size: 14),
                      SizedBox(width: 6),
                      Text(
                        'For your safety, never share OTP before the driver arrives.',
                        style: TextStyle(fontSize: 10, color: Color(0xFF0065B3), fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // Screen 8: Ride in Progress ("In Ride")
  // ===========================================================================
  Widget _buildInRideView(BuildContext context, RideTrackingActive state) {
    return Stack(
      children: [
        // 1. Live Map View
        Positioned.fill(
          child: AppMapView(
            pickup: state.pickup,
            destination: state.destination,
            driverPosition: state.driverPosition,
            driverBearing: state.driverBearing,
            routePoints: state.routePoints,
            driverVehicleType: state.vehicleName,
          ),
        ),

        // 2. Floating Top Header with SOS Button
        Positioned(
          top: MediaQuery.of(context).padding.top + 8,
          left: 16,
          right: 16,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF021B47)),
                  onPressed: () => context.go('/home'),
                ),
                const Text(
                  'In Ride',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF021B47),
                    fontSize: 16,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFDE8E8),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'SOS',
                    style: TextStyle(
                      color: Color(0xFFE53935),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // 3. Bottom Sheet with In-Ride Stats & 3 Circular Actions
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(28),
                topRight: Radius.circular(28),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 16,
                  offset: Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Driver Details
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 22,
                      backgroundColor: Color(0xFFF1F5F9),
                      child: Icon(Icons.person, color: Color(0xFF021B47), size: 26),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                state.driverName,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                              ),
                              const SizedBox(width: 6),
                              const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                              Text(
                                ' ${state.driverRating.toStringAsFixed(1)}',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF535E79)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(state.driverVehicle, style: const TextStyle(fontSize: 12, color: Color(0xFF8A94A6))),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Trip Stats: Distance, Duration, Fare
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7F9FC),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildPillItem('6.2 km', 'Distance'),
                      _buildPillDivider(),
                      _buildPillItem('18 min', 'Duration'),
                      _buildPillDivider(),
                      _buildPillItem('₹${state.fare.toStringAsFixed(0)}', 'Fare'),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // 3 Circular Quick Actions: Support, SOS, Share Live Location
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildCircularAction(
                      icon: Icons.headset_mic_rounded,
                      color: const Color(0xFF009048),
                      label: 'Support',
                      onTap: () {},
                    ),
                    _buildCircularAction(
                      icon: Icons.shield_rounded,
                      color: const Color(0xFFE53935),
                      label: 'SOS',
                      onTap: () {},
                    ),
                    _buildCircularAction(
                      icon: Icons.share_location_rounded,
                      color: const Color(0xFF0065B3),
                      label: 'Share Live\nLocation',
                      onTap: () {},
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // Screen 9: Ride Completed
  // ===========================================================================
  Widget _buildRideCompletedReceiptView(BuildContext context, RideTrackingActive state) {
    final price = state.fare;
    final double baseFare = (price * 0.75).clamp(20.0, price);
    final double distanceFare = (price * 0.18).clamp(5.0, price);
    final double timeFare = (price - baseFare - distanceFare).clamp(0.0, price);

    return Scaffold(
      backgroundColor: const Color(0xFF009048),
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 32),
            // Checkmark Circle Icon
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_rounded, color: Color(0xFF009048), size: 48),
            ),
            const SizedBox(height: 16),
            const Text(
              'Ride Completed!',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 4),
            const Text(
              'Thank you for riding with Ryva Ride.',
              style: TextStyle(fontSize: 14, color: Colors.white70),
            ),
            const SizedBox(height: 28),

            // White Receipt Card
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(28),
                    topRight: Radius.circular(28),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total Fare',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                        ),
                        Text(
                          '₹${price.toStringAsFixed(0)}',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(),
                    const SizedBox(height: 10),

                    _buildReceiptRow('Base Fare', '₹${baseFare.toStringAsFixed(0)}'),
                    _buildReceiptRow('Distance (6.2 km)', '₹${distanceFare.toStringAsFixed(0)}'),
                    _buildReceiptRow('Time (18 min)', '₹${timeFare.toStringAsFixed(0)}'),
                    const SizedBox(height: 14),
                    const Divider(),
                    const SizedBox(height: 10),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Paid via', style: TextStyle(fontSize: 14, color: Color(0xFF8A94A6))),
                        Row(
                          children: [
                            Icon(
                              state.paymentMethod == 'wallet' ? Icons.account_balance_wallet_rounded : Icons.payments_rounded,
                              color: const Color(0xFF009048),
                              size: 18,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              state.paymentMethod == 'wallet' ? 'Ryva Wallet (Debited)' : 'Cash',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                            ),
                          ],
                        ),
                      ],
                    ),

                    const Spacer(),

                    // "Done" Button -> Opens Screen 10 (Rating Modal)
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: () {
                          _showRateRideDialog(context, state);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF009048),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        child: const Text('Done', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // Screen 10: Rate Your Ride (Dialog / Modal)
  // ===========================================================================
  void _showRateRideDialog(BuildContext context, RideTrackingActive state) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            String sentiment = 'Great ride!';
            if (_selectedRating == 5) sentiment = 'Great ride!';
            if (_selectedRating == 4) sentiment = 'Good ride';
            if (_selectedRating == 3) sentiment = 'Average';
            if (_selectedRating <= 2) sentiment = 'Could be better';

            return Dialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              child: Padding(
                padding: const EdgeInsets.all(22),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Color(0xFF8A94A6)),
                          onPressed: () {
                            Navigator.pop(dialogContext);
                            if (mounted) {
                              setState(() {
                                _showThankYou = true;
                              });
                            }
                          },
                        ),
                      ],
                    ),

                    const CircleAvatar(
                      radius: 30,
                      backgroundColor: Color(0xFFF1F5F9),
                      child: Icon(Icons.person, color: Color(0xFF021B47), size: 34),
                    ),
                    const SizedBox(height: 10),

                    Text(
                      state.driverName,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.star_rounded, size: 14, color: Colors.amber),
                        Text(
                          ' ${state.driverRating.toStringAsFixed(1)}',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF535E79)),
                        ),
                        const SizedBox(width: 8),
                        Text(state.plateNumber, style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6))),
                      ],
                    ),
                    const SizedBox(height: 14),

                    const Text(
                      'How was your ride?',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                    ),
                    const SizedBox(height: 12),

                    // 5 Star Rating Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        final starPos = index + 1;
                        final isSelected = starPos <= _selectedRating;
                        return IconButton(
                          icon: Icon(
                            Icons.star_rounded,
                            color: isSelected ? Colors.amber : Colors.grey.shade300,
                            size: 34,
                          ),
                          onPressed: () {
                            setModalState(() {
                              _selectedRating = starPos;
                            });
                          },
                        );
                      }),
                    ),
                    const SizedBox(height: 2),

                    Text(
                      sentiment,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF009048)),
                    ),
                    const SizedBox(height: 14),

                    // Optional Comment Field
                    TextField(
                      controller: _commentController,
                      maxLines: 2,
                      style: const TextStyle(fontSize: 13, color: Color(0xFF021B47)),
                      decoration: InputDecoration(
                        hintText: 'Add a comment (optional)',
                        hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                        contentPadding: const EdgeInsets.all(12),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFF009048)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Submit Rating Button -> transitions to Screen 11 (Thank You)
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: _isSubmittingRating
                            ? null
                            : () async {
                                setModalState(() {
                                  _isSubmittingRating = true;
                                });

                                try {
                                  final dioClient = sl<DioClient>();
                                  await dioClient.dio.post('/api/v1/rides/${state.rideId}/rate', data: {
                                    'rating': _selectedRating,
                                    'review': _commentController.text,
                                  });
                                } catch (_) {}

                                Navigator.pop(dialogContext);
                                if (mounted) {
                                  setState(() {
                                    _showThankYou = true;
                                  });
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF009048),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: _isSubmittingRating
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text(
                                'Submit Rating',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  // ===========================================================================
  // Screen 11: Thank You Screen
  // ===========================================================================
  Widget _buildThankYouView(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),

              // Celebration Checkmark badge
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: const BoxDecoration(
                    color: Color(0xFF009048),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_rounded, color: Colors.white, size: 44),
                ),
              ),
              const SizedBox(height: 24),

              // Ryva Car Graphic
              Center(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  child: Image.asset(
                    'assets/icons/car.png',
                    width: 140,
                    height: 90,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => const Icon(
                      Icons.directions_car_filled_rounded,
                      color: Color(0xFF009048),
                      size: 64,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              const Text(
                'Thank You!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF021B47),
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'We hope to see you again.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: Color(0xFF8A94A6),
                ),
              ),

              const Spacer(),

              // "Back to Home" Primary Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: () {
                    context.read<BookingBloc>().add(ClearBooking());
                    context.read<WalletBloc>().add(LoadWalletDetails());
                    context.go('/home');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF009048),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Back to Home',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // "View My Rides" Secondary Link
              Center(
                child: TextButton(
                  onPressed: () {
                    context.read<BookingBloc>().add(ClearBooking());
                    context.go('/ride-history');
                  },
                  child: const Text(
                    'View My Rides',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF009048),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // Shared UI Helpers
  // ===========================================================================
  Widget _buildPillItem(String val, String label) {
    return Column(
      children: [
        Text(
          val,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: Color(0xFF021B47),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
        ),
      ],
    );
  }

  Widget _buildPillDivider() {
    return Container(
      width: 1,
      height: 24,
      color: Colors.grey.shade200,
    );
  }

  Widget _buildCircularAction({
    required IconData icon,
    required Color color,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.10),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF535E79)),
          ),
        ],
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF8A94A6))),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
        ],
      ),
    );
  }

  void _showCancelConfirmationDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text(
            'Cancel Ride Request?',
            style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
          ),
          content: const Text(
            'Are you sure you want to cancel your ride request?',
            style: TextStyle(color: Color(0xFF535E79), fontSize: 14),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Keep Searching', style: TextStyle(color: Color(0xFF8A94A6), fontWeight: FontWeight.w600)),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(dialogContext);
                context.read<RideTrackingBloc>().add(CancelRide());
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE53935),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              child: const Text('Cancel Ride', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }
}
