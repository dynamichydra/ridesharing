import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/app_map_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../bloc/ride_tracking_bloc.dart';
import '../../../booking/presentation/bloc/booking_bloc.dart';
import '../../../wallet/presentation/bloc/wallet_bloc.dart';
import '../../../profile/presentation/bloc/profile_bloc.dart';
import '../../../../injection_container.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/utils/location_helper.dart';

class RideTrackingPage extends StatefulWidget {
  const RideTrackingPage({super.key});

  @override
  State<RideTrackingPage> createState() => _RideTrackingPageState();
}

class _RideTrackingPageState extends State<RideTrackingPage> {
  int _selectedRating = 5;
  final TextEditingController _commentController = TextEditingController();
  bool _isSubmittingRating = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

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
          if (state is RideTrackingLoading || state is RideTrackingSearching) {
            return const LoadingView();
          }

          if (state is RideTrackingActive) {
            // Determine state flags
            final bool isDriverArriving = state.trackingState == 'driverArriving';
            final bool isRideCompleted = state.trackingState == 'rideCompleted';

            final targetLocation = isDriverArriving ? state.pickup : state.destination;
            final distanceKm = LocationHelper.calculateDistance(
              state.driverPosition.latitude,
              state.driverPosition.longitude,
              targetLocation.latitude,
              targetLocation.longitude,
            );
            
            // Assume 3 mins per km for urban driving
            final double etaMin = (distanceKm * 3.0).clamp(1.0, 60.0);
            final String etaText = etaMin.toStringAsFixed(0);

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
                                  color: Colors.black.withValues(alpha: 0.06),
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
                                    color: Color(0xFF009048),
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
                                  color: Colors.black.withValues(alpha: 0.06),
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

                          // Driver info Card
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 24,
                                backgroundColor: const Color(0xFFF1F5F9),
                                backgroundImage: (state.driverAvatar.isNotEmpty)
                                    ? NetworkImage(state.driverAvatar)
                                    : null,
                                child: state.driverAvatar.isEmpty
                                    ? const Icon(Icons.person, color: Color(0xFF535E79))
                                    : null,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      state.driverName,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0A2540),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                                        const SizedBox(width: 4),
                                        Text(
                                          state.driverRating.toStringAsFixed(1),
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFF535E79),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    state.driverVehicle,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF0A2540),
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      state.plateNumber,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF535E79),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),

                          const SizedBox(height: 20),
                          const Divider(),
                          const SizedBox(height: 16),

                          // Quick actions
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _buildCircularAction(
                                icon: Icons.call,
                                color: const Color(0xFF009048),
                                label: 'Call Driver',
                                onTap: () {},
                              ),
                              _buildCircularAction(
                                icon: Icons.chat_bubble_rounded,
                                color: const Color(0xFF009048),
                                label: 'Message',
                                onTap: () {},
                              ),
                              _buildCircularAction(
                                icon: Icons.cancel_outlined,
                                color: const Color(0xFFE53935),
                                label: 'Cancel Ride',
                                onTap: () {
                                  context.read<RideTrackingBloc>().add(CancelRide());
                                },
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

          return const SizedBox.shrink();
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
              color: color.withValues(alpha: 0.08),
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

  // Ride completed receipt with interactive rating & optional comments
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
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 24),
                decoration: const BoxDecoration(
                  color: Color(0xFF009048),
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
                      child: const Icon(Icons.check_rounded, color: Color(0xFF009048), size: 36),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Ride Completed',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 4),
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
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Total fare row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Total Fare Paid',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                          ),
                          Text(
                            '₹${state.fare.toStringAsFixed(0)}',
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF009048)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Divider(),
                      const SizedBox(height: 12),

                      // Receipt details
                      _buildReceiptRow('Base Fare', '₹85'),
                      _buildReceiptRow('Distance (10.2 km)', '₹30'),
                      _buildReceiptRow('Time (22 min)', '₹10'),
                      _buildReceiptRow('Payment Method', 'Cash'),
                      
                      const SizedBox(height: 20),
                      const Divider(),
                      const SizedBox(height: 20),

                      // Interactive Star Rating
                      const Center(
                        child: Text(
                          'Rate your experience',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0A2540)),
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(5, (index) {
                          final starPos = index + 1;
                          final isSelected = starPos <= _selectedRating;
                          return IconButton(
                            icon: Icon(
                              Icons.star_rounded,
                              color: isSelected ? Colors.amber : Colors.grey.shade300,
                              size: 40,
                            ),
                            onPressed: () {
                              setState(() {
                                _selectedRating = starPos;
                              });
                            },
                          );
                        }),
                      ),
                      const SizedBox(height: 16),

                      // Optional Review Text Field
                      const Text(
                        'Review comments (Optional)',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _commentController,
                        maxLines: 3,
                        style: const TextStyle(fontSize: 14, color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          hintText: 'Share details of your trip here...',
                          hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
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
                    ],
                  ),
                ),
              ),

              // Submit Action Button
              Padding(
                padding: const EdgeInsets.only(left: 24, right: 24, bottom: 20),
                child: SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _isSubmittingRating
                        ? null
                        : () async {
                            final bookingBloc = context.read<BookingBloc>();
                            final messenger = ScaffoldMessenger.of(context);
                            final router = GoRouter.of(context);

                            setState(() {
                              _isSubmittingRating = true;
                            });

                            // Submit rating to backend
                            try {
                              final dioClient = sl<DioClient>();
                              await dioClient.dio.post('/api/v1/rides/${state.rideId}/rate', data: {
                                'rating': _selectedRating,
                                'review': _commentController.text,
                              });
                            } catch (e) {
                              print('[RideTrackingPage] Rating submission failed: $e');
                            }

                            if (mounted) {
                              messenger.showSnackBar(
                                const SnackBar(
                                  content: Text('Thank you for rating!'),
                                  backgroundColor: Color(0xFF009048),
                                ),
                              );
                              bookingBloc.add(ClearBooking());
                              router.go('/home');
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF009048),
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: const Color(0xFFCBD5E1),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: _isSubmittingRating
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : const Text(
                            'Submit Rating',
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
