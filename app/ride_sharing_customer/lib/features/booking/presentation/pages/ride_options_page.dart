import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/app_map_view.dart';
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

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Ride Options',
          style: TextStyle(color: Color(0xFF021B47), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87),
          onPressed: () {
            context.read<BookingBloc>().add(ClearBooking());
            context.pop();
          },
        ),
      ),
      body: BlocConsumer<BookingBloc, BookingState>(
        listener: (context, state) {
          if (state is BookingConfirmed) {
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
                // 1. Map path view
                Positioned.fill(
                  child: AppMapView(
                    pickup: state.pickup,
                    destination: state.destination,
                    routePoints: routePoints,
                  ),
                ),

                // 2. Floating Top Route Pins Card
                Positioned(
                  top: 12,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.all(14),
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
                      children: [
                        // Pin Dotted Line Column
                        Column(
                          children: [
                            const Icon(Icons.circle, color: Color(0xFF01A34D), size: 12),
                            Container(
                              height: 24,
                              width: 1,
                              decoration: BoxDecoration(
                                color: Colors.grey.shade300,
                              ),
                            ),
                            const Icon(Icons.location_on_rounded, color: Color(0xFFE53935), size: 14),
                          ],
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                state.pickupName.isNotEmpty ? state.pickupName : 'Pickup Location',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF021B47),
                                ),
                              ),
                              const SizedBox(height: 14),
                              Text(
                                state.destinationName.isNotEmpty ? state.destinationName : 'Destination Location',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF021B47),
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Swap button
                        const Icon(Icons.swap_vert_rounded, color: Colors.grey),
                      ],
                    ),
                  ),
                ),

                // 3. Bottom Sheet
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
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
                        const SizedBox(height: 12),
                        Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade300,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(height: 16),
                        
                        // "Recommended" Title
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Row(
                            children: const [
                              Text(
                                'Recommended',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF021B47),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),

                        // List of Vehicles
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Column(
                            children: state.vehicles.map((vehicle) {
                              final isSelected = state.selectedVehicle.id == vehicle.id;
                              final price = state.calculatedFares[vehicle.id] ?? 0.0;

                              return InkWell(
                                onTap: () {
                                  context.read<BookingBloc>().add(SelectVehicle(vehicle));
                                },
                                child: Container(
                                  margin: const EdgeInsets.symmetric(vertical: 6),
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isSelected ? const Color(0xFF01A34D) : const Color(0xFFE2E7E9),
                                      width: isSelected ? 2 : 1,
                                    ),
                                    boxShadow: isSelected
                                        ? [
                                            BoxShadow(
                                              color: const Color(0xFF01A34D).withOpacity(0.04),
                                              blurRadius: 10,
                                              offset: const Offset(0, 4),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Row(
                                    children: [
                                      // Vehicle icon fallback
                                      Container(
                                        width: 50,
                                        height: 50,
                                        decoration: BoxDecoration(
                                          color: isSelected
                                              ? const Color(0xFF01A34D).withOpacity(0.06)
                                              : Colors.grey.shade100,
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Icon(
                                          Icons.directions_car_filled_rounded,
                                          color: isSelected ? const Color(0xFF01A34D) : const Color(0xFF0165B7),
                                          size: 28,
                                        ),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Text(
                                                  vehicle.name,
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 15,
                                                    color: Color(0xFF021B47),
                                                  ),
                                                ),
                                                const SizedBox(width: 6),
                                                const Icon(Icons.person_rounded, size: 14, color: Colors.grey),
                                                Text(
                                                  ' ${vehicle.capacity}',
                                                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '${vehicle.etaMinutes} min away • Drop in 15 min',
                                              style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            '${AppConstants.currencySymbol}${price.toStringAsFixed(0)}',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF021B47),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Payment section Row
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: InkWell(
                            onTap: () => context.push('/payment-methods'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                border: Border.all(color: const Color(0xFFE2E7E9)),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Payment',
                                    style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                                  ),
                                  Row(
                                    children: const [
                                      Icon(Icons.account_balance_wallet_rounded, color: Color(0xFF01A34D), size: 18),
                                      SizedBox(width: 8),
                                      Text(
                                        'Cash',
                                        style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                                      ),
                                      SizedBox(width: 6),
                                      Icon(Icons.keyboard_arrow_down_rounded, color: Colors.grey),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Action Confirm Button
                        Padding(
                          padding: const EdgeInsets.only(left: 16, right: 16, bottom: 20),
                          child: SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: ElevatedButton(
                              onPressed: () {
                                context.read<BookingBloc>().add(ConfirmRideBooking());
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF01A34D),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                elevation: 0,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const SizedBox(width: 24),
                                  Text(
                                    'Confirm ${state.selectedVehicle.name}',
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    '${AppConstants.currencySymbol}${(state.calculatedFares[state.selectedVehicle.id] ?? 0.0).toStringAsFixed(0)}',
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
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

          return const LoadingView();
        },
      ),
    );
  }
}
