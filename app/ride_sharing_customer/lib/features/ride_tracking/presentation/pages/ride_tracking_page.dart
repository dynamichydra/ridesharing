import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/app_map_view.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/loading_view.dart';
import '../bloc/ride_tracking_bloc.dart';
import '../../../booking/presentation/bloc/booking_bloc.dart';

class RideTrackingPage extends StatelessWidget {
  const RideTrackingPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      body: BlocConsumer<RideTrackingBloc, RideTrackingState>(
        listener: (context, state) {
          if (state is RideTrackingCancelled) {
            context.read<BookingBloc>().add(ClearBooking());
            context.go('/home');
          }
        },
        builder: (context, state) {
          if (state is RideTrackingLoading) {
            return const LoadingView();
          }

          if (state is RideTrackingActive) {
            final double etaMin = ((state.routePoints.length - state.stepIndex) * 0.4).clamp(1.0, 15.0);
            final String etaText = etaMin.toStringAsFixed(0);

            // Determine status text
            String statusHeader = '';
            String statusDesc = '';
            if (state.trackingState == 'driverArriving') {
              statusHeader = 'Driver is arriving';
              statusDesc = '${state.driverName} is $etaText min away in a ${state.driverVehicle}';
            } else if (state.trackingState == 'rideInProgress') {
              statusHeader = 'Heading to destination';
              statusDesc = 'Arriving at ${state.destinationName} in $etaText min';
            } else if (state.trackingState == 'rideCompleted') {
              statusHeader = 'Ride Completed';
              statusDesc = 'You have safely arrived at your destination!';
            }

            return Stack(
              children: [
                // 1. Live Map with vehicle symbol moving
                Positioned.fill(
                  child: AppMapView(
                    pickup: state.pickup,
                    destination: state.destination,
                    driverPosition: state.driverPosition,
                    driverBearing: state.driverBearing,
                    routePoints: state.routePoints,
                  ),
                ),

                // 2. Top Info Header
                Positioned(
                  top: MediaQuery.of(context).padding.top + AppSpacing.s,
                  left: AppSpacing.m,
                  right: AppSpacing.m,
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.m),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 10,
                                height: 10,
                                decoration: const BoxDecoration(
                                  color: AppColors.successGreen,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                statusHeader,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            statusDesc,
                            style: theme.textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // 3. Bottom Sheet Detail panel
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.l),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurface : Colors.white,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(AppRadius.xl),
                        topRight: Radius.circular(AppRadius.xl),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 15,
                          offset: const Offset(0, -4),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (state.trackingState != 'rideCompleted') ...[
                          // Driver Profile Detail Card
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 28,
                                backgroundImage: NetworkImage(state.driverAvatar),
                              ),
                              const SizedBox(width: AppSpacing.m),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      state.driverName,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                    ),
                                    Row(
                                      children: [
                                        const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                                        const SizedBox(width: 2),
                                        Text(
                                          '${state.driverRating}',
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          '• ${state.vehicleName}',
                                          style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              // Call action trigger
                              Container(
                                decoration: BoxDecoration(
                                  color: isDark ? Colors.grey[850] : Colors.grey[100],
                                  shape: BoxShape.circle,
                                ),
                                child: IconButton(
                                  icon: const Icon(Icons.phone_rounded, color: AppColors.primaryBlue),
                                  onPressed: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Calling ${state.driverName} at ${state.plateNumber}...')),
                                    );
                                  },
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 24),
                          // Vehicle Metadata card details
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    state.driverVehicle,
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    'Plate: ${state.plateNumber}',
                                    style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                                  ),
                                ],
                              ),
                              Text(
                                'Fare: ${AppConstants.currencySymbol}${state.fare}',
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.l),
                          CustomButton(
                            text: 'Cancel Ride',
                            backgroundColor: theme.colorScheme.error,
                            onPressed: () {
                              context.read<RideTrackingBloc>().add(CancelRide());
                            },
                          ),
                        ] else ...[
                          // RIDE COMPLETED STATE: Display rating card details
                          const Icon(Icons.check_circle_rounded, color: AppColors.successGreen, size: 64),
                          const SizedBox(height: AppSpacing.m),
                          const Text(
                            'Thank you for riding with Ride Sharing!',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
                          ),
                          const SizedBox(height: AppSpacing.s),
                          Text(
                            'Total Charged: ${AppConstants.currencySymbol}${state.fare}',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22),
                          ),
                          const SizedBox(height: AppSpacing.l),
                          Text('Rate your experience with ${state.driverName}:'),
                          const SizedBox(height: AppSpacing.s),
                          // Star selections
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(
                              5,
                              (index) => const Icon(Icons.star_rounded, color: Colors.amber, size: 36),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xl),
                          CustomButton(
                            text: 'Done',
                            onPressed: () {
                              // Reset active booking and return home
                              context.read<BookingBloc>().add(ClearBooking());
                              context.go('/home');
                            },
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
}
