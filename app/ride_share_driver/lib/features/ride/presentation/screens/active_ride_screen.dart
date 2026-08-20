import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../style/appcolors.dart';
import '../../domain/entities/active_ride.dart';
import '../widgets/driver_map_view.dart';

/// Full-screen takeover shown in place of the dashboard while a ride is
/// accepted/arriving/started, or briefly on completion.
/// Includes live Google Map view with car movement tracking, registered path,
/// and primary status controls.
class ActiveRideScreen extends StatelessWidget {
  final ActiveRide ride;
  final LatLng? driverPosition;
  final double driverBearing;
  final List<LatLng> traveledPath;
  final bool isBusy;
  final VoidCallback onMarkArriving;
  final VoidCallback onStart;
  final VoidCallback onComplete;
  final VoidCallback onCancel;

  const ActiveRideScreen({
    super.key,
    required this.ride,
    this.driverPosition,
    this.driverBearing = 0.0,
    this.traveledPath = const [],
    required this.isBusy,
    required this.onMarkArriving,
    required this.onStart,
    required this.onComplete,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final pickupPos = LatLng(ride.pickupLat, ride.pickupLng);
    final dropPos = LatLng(ride.dropLat, ride.dropLng);

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // 1. Live Map View showing driver movement & registered path
          Positioned.fill(
            child: DriverMapView(
              pickup: pickupPos,
              destination: dropPos,
              driverPosition: driverPosition,
              driverBearing: driverBearing,
              traveledPath: traveledPath,
            ),
          ),

          // 2. Top Header Bar Overlay
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
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
                      color: AppColors.primary.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.navigation_rounded, color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _titleFor(ride.status),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          ride.status == 'started'
                              ? 'Path is being registered...'
                              : 'Following route to location',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatBadge(
                    label: 'Fare',
                    value: _fareLabel(ride),
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
                    // Handle Bar
                    Container(
                      width: 38,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),

                    // Pickup / Drop Location Info
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _AddressRow(
                            icon: Icons.trip_origin,
                            color: AppColors.primary,
                            label: ride.pickupAddress ?? 'Pickup location',
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                            child: SizedBox(
                              height: 12,
                              width: 1,
                              child: VerticalDivider(color: AppColors.border),
                            ),
                          ),
                          _AddressRow(
                            icon: Icons.location_on,
                            color: AppColors.error,
                            label: ride.dropAddress ?? 'Drop location',
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    if (ride.status != 'started')
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: isBusy ? null : onCancel,
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.error,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                          child: const Text('Cancel Ride', style: TextStyle(fontWeight: FontWeight.w600)),
                        ),
                      ),
                    const SizedBox(height: 4),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isBusy ? null : _primaryActionFor(ride.status),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        child: isBusy
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Text(
                                _primaryLabelFor(ride.status),
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _fareLabel(ActiveRide ride) {
    final minor = ride.finalFareMinor ?? ride.estimatedFareMinor;
    if (minor == null) return '—';
    final major = minor / 100;
    final currency = ride.currencyCode ?? '';
    return '$currency ${major.toStringAsFixed(2)}';
  }

  String _titleFor(String status) {
    switch (status) {
      case 'accepted':
        return 'Heading to pickup';
      case 'arriving':
        return 'Arrived at pickup';
      case 'started':
        return 'Trip in progress';
      default:
        return 'Current ride';
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

  VoidCallback _primaryActionFor(String status) {
    switch (status) {
      case 'accepted':
        return onMarkArriving;
      case 'arriving':
        return onStart;
      case 'started':
        return onComplete;
      default:
        return onStart;
    }
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
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

class _StatBadge extends StatelessWidget {
  final String label;
  final String value;
  const _StatBadge({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.primary)),
        ],
      ),
    );
  }
}
