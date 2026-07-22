import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/app_map_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../bloc/ride_tracking_bloc.dart';
import '../../../booking/presentation/bloc/booking_bloc.dart';
import '../../../wallet/presentation/bloc/wallet_bloc.dart';
import '../../../profile/presentation/bloc/profile_bloc.dart';

class RideTrackingPage extends StatelessWidget {
  const RideTrackingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: BlocConsumer<RideTrackingBloc, RideTrackingState>(
        listener: (context, state) {
          if (state is RideTrackingCancelled) {
            context.read<BookingBloc>().add(ClearBooking());
            context.go('/home');
          } else if (state is RideTrackingActive && state.trackingState == 'rideCompleted') {
            context.read<WalletBloc>().add(LoadWalletDetails());
            context.read<ProfileBloc>().add(LoadProfile());
          }
        },
        builder: (context, state) {
          if (state is RideTrackingLoading) {
            return const LoadingView();
          }

          if (state is RideTrackingActive) {
            final double etaMin = ((state.routePoints.length - state.stepIndex) * 0.4).clamp(1.0, 15.0);
            final String etaText = etaMin.toStringAsFixed(0);

            // Determine state flags
            final bool isDriverArriving = state.trackingState == 'driverArriving';
            final bool isRideInProgress = state.trackingState == 'rideInProgress';
            final bool isRideCompleted = state.trackingState == 'rideCompleted';

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
                  ),
                ),

                // 2. Floating Top Header depending on state
                if (!isRideCompleted)
                  Positioned(
                    top: MediaQuery.of(context).padding.top + 8,
                    left: 16,
                    right: 16,
                    child: isDriverArriving
                        ? Container(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.06),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: Column(
                              children: [
                                const Text(
                                  'Driver is on the way',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF01A34D),
                                    fontSize: 15,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Arriving in $etaText min',
                                  style: const TextStyle(
                                    color: Color(0xFF535E79),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : Container(
                            // Ride in progress top details
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.06),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                _buildTopStatItem('10.2 km', 'Distance'),
                                _buildTopStatDivider(),
                                _buildTopStatItem('$etaText min', 'Duration'),
                                _buildTopStatDivider(),
                                _buildTopStatItem('₹${state.fare.toStringAsFixed(0)}', 'Fare'),
                              ],
                            ),
                          ),
                  ),

                // 3. Bottom sheet / overlay receipt
                if (isRideCompleted)
                  _buildCompletedReceiptView(context, state)
                else
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
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Handle bar
                          Container(
                            width: 40,
                            height: 4,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade300,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Driver Profile details
                          Row(
                            children: [
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: const Color(0xFFE2E7E9)),
                                  image: const DecorationImage(
                                    image: AssetImage('assets/images/onboarding_driver.png'),
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      state.driverName,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                        color: Color(0xFF021B47),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${state.driverVehicle} • ${state.plateNumber}',
                                      style: const TextStyle(fontSize: 12, color: Color(0xFF8A94A6)),
                                    ),
                                  ],
                                ),
                              ),
                              // Rating badge
                              Row(
                                children: [
                                  const Icon(Icons.star_rounded, color: Colors.amber, size: 18),
                                  const SizedBox(width: 2),
                                  Text(
                                    '${state.driverRating}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF021B47),
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),

                          if (isDriverArriving) ...[
                            // Communication Actions row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildCircularAction(
                                  icon: Icons.phone_rounded,
                                  color: const Color(0xFF01A34D),
                                  label: 'Call',
                                  onTap: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Calling ${state.driverName}...')),
                                    );
                                  },
                                ),
                                _buildCircularAction(
                                  icon: Icons.message_rounded,
                                  color: const Color(0xFF01A34D),
                                  label: 'Message',
                                  onTap: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Chat with ${state.driverName} opened')),
                                    );
                                  },
                                ),
                                _buildCircularAction(
                                  icon: Icons.share_rounded,
                                  color: const Color(0xFF01A34D),
                                  label: 'Share',
                                  onTap: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Share ride details triggered')),
                                    );
                                  },
                                ),
                                _buildCircularAction(
                                  icon: Icons.close_rounded,
                                  color: const Color(0xFFE53935),
                                  label: 'Cancel',
                                  onTap: () {
                                    context.read<RideTrackingBloc>().add(CancelRide());
                                  },
                                ),
                              ],
                            ),
                          ] else ...[
                            // Share live location button
                            SizedBox(
                              width: double.infinity,
                              height: 52,
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Sharing live location link...')),
                                  );
                                },
                                icon: const Icon(Icons.share_location_rounded, color: Color(0xFF0165B7)),
                                label: const Text(
                                  'Share Live Location',
                                  style: TextStyle(color: Color(0xFF0165B7), fontWeight: FontWeight.bold),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: Color(0xFFE2E7E9)),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
              ],
            );
          }

          return const Scaffold(body: LoadingView());
        },
      ),
    );
  }

  Widget _buildTopStatItem(String val, String label) {
    return Column(
      children: [
        Text(
          val,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
        ),
      ],
    );
  }

  Widget _buildTopStatDivider() {
    return Container(
      width: 1,
      height: 28,
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
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: color.withOpacity(0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF535E79)),
          ),
        ],
      ),
    );
  }

  // Ride completed full overlay matching the receipt design screen
  Widget _buildCompletedReceiptView(BuildContext context, RideTrackingActive state) {
    return Positioned.fill(
      child: Container(
        color: Colors.white,
        child: SafeArea(
          child: Column(
            children: [
              // Green completed header
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 24),
                decoration: const BoxDecoration(
                  color: Color(0xFF01A34D),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(24),
                    bottomRight: Radius.circular(24),
                  ),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check_rounded, color: Color(0xFF01A34D), size: 36),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Ride Completed',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Thank you for riding with us!',
                      style: TextStyle(fontSize: 14, color: Colors.white70),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      // Total fare row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Total Fare',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                          ),
                          Text(
                            '₹${state.fare.toStringAsFixed(0)}',
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Divider(),
                      const SizedBox(height: 12),

                      // Receipt table list items
                      _buildReceiptRow('Base Fare', '₹85'),
                      _buildReceiptRow('Distance (10.2 km)', '₹30'),
                      _buildReceiptRow('Time (22 min)', '₹10'),
                      _buildReceiptRow('Platform Fee', '₹0'),
                      _buildReceiptRow('Payment Method', 'Cash'),
                      
                      const SizedBox(height: 24),
                      const Divider(),
                      const SizedBox(height: 24),

                      // Rate Driver Section
                      const Text(
                        'Rate your ride',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                      ),
                      const SizedBox(height: 12),
                      
                      // 5 Stars row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          5,
                          (index) => Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: Icon(
                              Icons.star_rounded,
                              color: index < 4 ? Colors.amber : Colors.grey.shade300,
                              size: 36,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Done action button at bottom
              Padding(
                padding: const EdgeInsets.only(left: 24, right: 24, bottom: 20),
                child: SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: () {
                      context.read<BookingBloc>().add(ClearBooking());
                      context.go('/home');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF01A34D),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Done',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
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

  Widget _buildReceiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 14, color: Color(0xFF8A94A6))),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
        ],
      ),
    );
  }
}
