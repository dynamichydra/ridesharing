import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/app_map_view.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/utils/location_helper.dart';
import '../bloc/booking_bloc.dart';
import '../../../ride_tracking/presentation/bloc/ride_tracking_bloc.dart';

class RideOptionsPage extends StatelessWidget {
  const RideOptionsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Ride'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () {
            context.read<BookingBloc>().add(ClearBooking());
            context.pop();
          },
        ),
      ),
      body: BlocConsumer<BookingBloc, BookingState>(
        listener: (context, state) {
          if (state is BookingConfirmed) {
            // Initialize the RideTrackingBloc with the booked details
            context.read<RideTrackingBloc>().add(
                  StartRideTracking(
                    pickup: state.pickup,
                    pickupName: state.pickupName,
                    destination: state.destination,
                    destinationName: state.destinationName,
                    vehicleName: state.selectedVehicle.name,
                    fare: state.fare,
                  ),
                );
            // Navigate to tracking
            context.go('/ride-tracking');
          } else if (state is BookingError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: theme.colorScheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is BookingLoading) {
            return const LoadingView();
          }

          if (state is BookingError) {
            return ErrorView(
              message: state.message,
              onRetry: () => context.pop(),
            );
          }

          if (state is BookingVehicleOptionsLoaded) {
            final routePoints = LocationHelper.generateRoutePoints(
              state.pickup,
              state.destination,
              20,
            );

            return Stack(
              children: [
                // 1. Map displaying path between points
                Positioned.fill(
                  child: AppMapView(
                    pickup: state.pickup,
                    destination: state.destination,
                    routePoints: routePoints,
                  ),
                ),

                // 2. Bottom Options Sheet
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.only(
                      top: AppSpacing.m,
                      left: AppSpacing.m,
                      right: AppSpacing.m,
                      bottom: AppSpacing.l,
                    ),
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
                        Container(
                          width: 40,
                          height: 4,
                          margin: const EdgeInsets.only(bottom: AppSpacing.m),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.grey[700] : Colors.grey[300],
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        // List of Vehicles
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: state.vehicles.length,
                          itemBuilder: (context, index) {
                            final vehicle = state.vehicles[index];
                            final isSelected = state.selectedVehicle.id == vehicle.id;
                            final price = state.calculatedFares[vehicle.id] ?? 0.0;

                            // Vehicle Icons Mapping
                            String icon = '🚗';
                            final typeLower = vehicle.type.toLowerCase();
                            final nameLower = vehicle.name.toLowerCase();

                            if (typeLower.contains('bike')) {
                              icon = '🏍️';
                            } else if (typeLower.contains('auto')) {
                              icon = '🛺';
                            } else if (typeLower.contains('hatchback')) {
                              icon = '🚗';
                            } else if (typeLower.contains('sedan') || typeLower == 'standard') {
                              icon = '🚙';
                            } else if (typeLower.contains('premium') || typeLower.contains('luxury') || typeLower.contains('cab')) {
                              icon = '🚕';
                            } else if (typeLower.contains('suv') || typeLower == 'xl') {
                              icon = '🚐';
                            } else if (typeLower.contains('electric') || nameLower.contains('electric')) {
                              icon = '⚡';
                            } else if (typeLower.contains('shared') || nameLower.contains('shared')) {
                              icon = '👥';
                            }

                            return Container(
                              margin: const EdgeInsets.symmetric(vertical: 4),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.primaryBlue.withOpacity(isDark ? 0.15 : 0.08)
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(AppRadius.l),
                                border: Border.all(
                                  color: isSelected ? AppColors.primaryBlue : Colors.transparent,
                                  width: 1.5,
                                ),
                              ),
                              child: ListTile(
                                leading: Container(
                                  padding: const EdgeInsets.all(AppSpacing.s),
                                  decoration: BoxDecoration(
                                    color: isDark ? Colors.grey[850] : Colors.grey[100],
                                    shape: BoxShape.circle,
                                  ),
                                  child: Text(
                                    icon,
                                    style: const TextStyle(fontSize: 28),
                                  ),
                                ),
                                title: Row(
                                  children: [
                                    Text(
                                      vehicle.name,
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(width: 8),
                                    Icon(Icons.person_rounded, size: 14, color: Colors.grey[500]),
                                    Text(
                                      '${vehicle.capacity}',
                                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                                    ),
                                  ],
                                ),
                                subtitle: Text('${vehicle.etaMinutes} min away • ${vehicle.description}'),
                                trailing: Text(
                                  '${AppConstants.currencySymbol}$price',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
                                ),
                                onTap: () {
                                  context.read<BookingBloc>().add(SelectVehicle(vehicle));
                                },
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: AppSpacing.m),
                        // Payment Method Row
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.m, vertical: 8),
                          decoration: BoxDecoration(
                            border: Border.all(color: isDark ? AppColors.darkDivider : AppColors.lightDivider),
                            borderRadius: BorderRadius.circular(AppRadius.m),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.credit_card_rounded, color: AppColors.primaryBlue),
                                  SizedBox(width: AppSpacing.s),
                                  Text(
                                    'Visa •••• 4242',
                                    style: TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              TextButton(
                                onPressed: () => context.push('/payment-methods'),
                                child: const Text('Change'),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.m),
                        // CTA Booking Button
                        CustomButton(
                          text: 'Confirm ${state.selectedVehicle.name}',
                          onPressed: () {
                            context.read<BookingBloc>().add(ConfirmRideBooking());
                          },
                        ),
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
