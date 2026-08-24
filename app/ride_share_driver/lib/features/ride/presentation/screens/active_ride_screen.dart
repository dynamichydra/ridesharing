import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../injection_container.dart' as di;
import '../../domain/entities/active_ride.dart';
import '../bloc/ride_bloc.dart';
import '../widgets/driver_map_view.dart';

class ActiveRidePage extends StatefulWidget {
  const ActiveRidePage({super.key});

  @override
  State<ActiveRidePage> createState() => _ActiveRidePageState();
}

class _ActiveRidePageState extends State<ActiveRidePage> {
  late final RideBloc _rideBloc = di.sl<RideBloc>();

  Future<void> _promptStartOtpAndDispatch(BuildContext context) async {
    final otpController = TextEditingController();
    final otp = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Enter Rider OTP',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Ask the rider for their 4-digit start OTP to begin the trip.',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: otpController,
              keyboardType: TextInputType.number,
              maxLength: 4,
              autofocus: true,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                letterSpacing: 6,
              ),
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                labelText: '4-Digit OTP',
                hintText: '1234',
                counterText: '',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(null),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () {
              final val = otpController.text.trim();
              if (val.length == 4) {
                Navigator.of(ctx).pop(val);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF009048),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Verify & Start'),
          ),
        ],
      ),
    );

    if (otp != null && otp.length == 4) {
      _rideBloc.add(StartRideRequested(otp: otp));
    }
  }

  void _confirmCancelRide(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Cancel this trip?',
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
        ),
        content: const Text(
          'Are you sure you want to cancel? This may affect your driver rating and completion rate.',
          style: TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Keep Ride', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _rideBloc.add(DriverCancelRequested(reason: 'Driver requested cancellation'));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE53935),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Confirm Cancel'),
          ),
        ],
      ),
    );
  }

  String _fareLabel(ActiveRide ride) {
    final minor = ride.finalFareMinor ?? ride.estimatedFareMinor;
    if (minor == null) return '—';
    final major = minor / 100;
    return '₹${major.toStringAsFixed(2)}';
  }

  String _titleFor(String status) {
    switch (status) {
      case 'accepted':
        return 'Heading to Pickup';
      case 'arriving':
        return 'Arrived at Pickup';
      case 'started':
        return 'Trip in Progress';
      default:
        return 'Active Ride';
    }
  }

  String _primaryLabelFor(String status) {
    switch (status) {
      case 'accepted':
        return "I've Arrived";
      case 'arriving':
        return 'Start Trip';
      case 'started':
        return 'Complete Trip';
      default:
        return 'Continue';
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<RideBloc, RideState>(
      bloc: _rideBloc,
      listener: (context, state) {
        if (state is RideCompleted) {
          final fareMinor = state.ride.finalFareMinor ?? state.ride.estimatedFareMinor ?? 0;
          final fare = (fareMinor / 100.0).toStringAsFixed(2);
          final isWallet = state.ride.paymentMethod?.toLowerCase() == 'wallet';
          if (isWallet) {
            CustomToast.show(context, 'Ride Completed! ₹$fare credited to your Ryva Wallet');
          } else {
            CustomToast.show(context, 'Ride Completed! Collect ₹$fare cash from rider');
          }
          if (context.canPop()) {
            context.pop();
          } else {
            context.go('/dashboard');
          }
        } else if (state is RideCancelledByRider) {
          CustomToast.show(context, state.message);
          if (context.canPop()) {
            context.pop();
          } else {
            context.go('/dashboard');
          }
        } else if (state is RideOperationFailed) {
          CustomToast.show(context, state.message);
        } else if (state is RideIdle) {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go('/dashboard');
          }
        }
      },
      builder: (context, state) {
        if (state is! RideActive) {
          return const Scaffold(
            backgroundColor: Colors.white,
            body: Center(
              child: CircularProgressIndicator(color: Color(0xFF009048)),
            ),
          );
        }

        final ride = state.ride;
        final driverPosition = state.driverPosition;
        final driverBearing = state.driverBearing;
        final traveledPath = state.traveledPath;
        final pickupPos = LatLng(ride.pickupLat, ride.pickupLng);
        final dropPos = LatLng(ride.dropLat, ride.dropLng);

        return Scaffold(
          backgroundColor: Colors.white,
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            scrolledUnderElevation: 0,
            leading: IconButton(
              icon: const Icon(
                Icons.arrow_back_ios_new_rounded,
                color: Color(0xFF021B47),
                size: 20,
              ),
              onPressed: () {
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/dashboard');
                }
              },
            ),
            title: Text(
              _titleFor(ride.status),
              style: const TextStyle(
                color: Color(0xFF021B47),
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            centerTitle: true,
          ),
          body: Stack(
            children: [
              // 1. Live Map View
              Positioned.fill(
                child: DriverMapView(
                  pickup: pickupPos,
                  destination: dropPos,
                  driverPosition: driverPosition,
                  driverBearing: driverBearing,
                  traveledPath: traveledPath,
                ),
              ),

              // 2. Top Info Pill Overlay
              Positioned(
                top: 12,
                left: 16,
                right: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF009048).withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.navigation_rounded, color: Color(0xFF009048), size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              ride.status == 'started'
                                  ? 'En route to Destination'
                                  : (ride.status == 'arriving'
                                      ? 'Waiting at Pickup Point'
                                      : 'Heading to Pickup Location'),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: Color(0xFF021B47),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              ride.status == 'started'
                                  ? 'Path is being recorded...'
                                  : 'Follow live route to passenger',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E7E9)),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('Fare', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                            Text(
                              _fareLabel(ride),
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF009048)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 3. Bottom Action Sheet Overlay
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(24),
                      topRight: Radius.circular(24),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black12,
                        blurRadius: 12,
                        offset: Offset(0, -4),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    top: false,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Handle bar
                        Container(
                          width: 38,
                          height: 4,
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade300,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),

                        // Pickup / Drop locations
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE2E7E9)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _AddressRow(
                                icon: Icons.trip_origin,
                                color: const Color(0xFF009048),
                                label: ride.pickupAddress ?? 'Pickup location',
                              ),
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                                child: SizedBox(
                                  height: 12,
                                  width: 1,
                                  child: VerticalDivider(color: Color(0xFFCBD5E1)),
                                ),
                              ),
                              _AddressRow(
                                icon: Icons.location_on,
                                color: const Color(0xFFE53935),
                                label: ride.dropAddress ?? 'Drop location',
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 14),

                        // Payment indicator
                        Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: (ride.paymentMethod?.toLowerCase() == 'wallet')
                                ? const Color(0xFFF0FDF4)
                                : const Color(0xFFFFFBEB),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: (ride.paymentMethod?.toLowerCase() == 'wallet')
                                  ? const Color(0xFF86EFAC)
                                  : const Color(0xFFFDE68A),
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                (ride.paymentMethod?.toLowerCase() == 'wallet')
                                    ? Icons.account_balance_wallet_rounded
                                    : Icons.payments_rounded,
                                size: 18,
                                color: (ride.paymentMethod?.toLowerCase() == 'wallet')
                                    ? const Color(0xFF009048)
                                    : const Color(0xFFD97706),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  (ride.paymentMethod?.toLowerCase() == 'wallet')
                                      ? 'Payment: Ryva Wallet (Automatic Credit)'
                                      : 'Payment: Cash (Collect ₹${((ride.finalFareMinor ?? ride.estimatedFareMinor ?? 0) / 100.0).toStringAsFixed(0)} cash from rider)',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: (ride.paymentMethod?.toLowerCase() == 'wallet')
                                        ? const Color(0xFF009048)
                                        : const Color(0xFFB45309),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Action button
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            onPressed: () {
                              if (ride.status == 'accepted') {
                                _rideBloc.add(MarkArrivingRequested());
                              } else if (ride.status == 'arriving') {
                                _promptStartOtpAndDispatch(context);
                              } else if (ride.status == 'started') {
                                _rideBloc.add(CompleteRideRequested());
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF009048),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              elevation: 0,
                            ),
                            child: Text(
                              _primaryLabelFor(ride.status),
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),

                        if (ride.status != 'started') ...[
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: TextButton(
                              onPressed: () => _confirmCancelRide(context),
                              style: TextButton.styleFrom(
                                foregroundColor: const Color(0xFFE53935),
                                padding: const EdgeInsets.symmetric(vertical: 8),
                              ),
                              child: const Text('Cancel Ride', style: TextStyle(fontWeight: FontWeight.w600)),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _AddressRow extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  const _AddressRow({required this.icon, required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontSize: 13, color: Color(0xFF021B47), fontWeight: FontWeight.w500),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
