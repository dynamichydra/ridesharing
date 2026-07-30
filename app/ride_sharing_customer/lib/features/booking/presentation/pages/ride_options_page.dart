import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/app_map_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/error_view.dart';
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
          'Choose Ride Options',
          style: TextStyle(color: Color(0xFF021B47), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF021B47)),
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
                    rideId: state.rideId,
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
            return Stack(
              children: [
                // 1. Map path view
                Positioned.fill(
                  child: AppMapView(
                    pickup: state.pickup,
                    destination: state.destination,
                    // Route polyline is not shown on this page;
                    // the real route was already drawn on SelectLocationPage.
                    routePoints: const [],
                  ),
                ),

                // 2. Floating Top Route Summary Card
                Positioned(
                  top: 12,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF021B47).withOpacity(0.08),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        // Dotted Line Column
                        Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(3),
                              decoration: const BoxDecoration(
                                color: Color(0xFFE6F6ED),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.circle, color: Color(0xFF01A34D), size: 10),
                            ),
                            Container(
                              height: 24,
                              width: 1,
                              decoration: BoxDecoration(
                                color: Colors.grey.shade300,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.all(3),
                              decoration: const BoxDecoration(
                                color: Color(0xFFFDE8E8),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.location_on_rounded, color: Color(0xFFE53935), size: 12),
                            ),
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
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF021B47),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                state.destinationName.isNotEmpty ? state.destinationName : 'Destination Location',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF021B47),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF7F9FC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFE2E7E9)),
                          ),
                          child: Column(
                            children: [
                              Text(
                                '${state.distanceMiles.toStringAsFixed(1)} mi',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF021B47),
                                ),
                              ),
                              const Text(
                                '~18 min',
                                style: TextStyle(fontSize: 10, color: Color(0xFF8A94A6)),
                              ),
                            ],
                          ),
                        ),
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
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(28),
                        topRight: Radius.circular(28),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF021B47).withOpacity(0.12),
                          blurRadius: 20,
                          offset: const Offset(0, -6),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(height: 12),
                        Container(
                          width: 36,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade300,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Section Title
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: const [
                              Text(
                                'Available Vehicles',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF021B47),
                                ),
                              ),
                              Text(
                                'Best Fares',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF01A34D),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),

                        // List of Vehicles including Cab Share Mode
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Column(
                            children: state.vehicles.map((vehicle) {
                              final isSelected = state.selectedVehicle.id == vehicle.id;
                              final price = state.calculatedFares[vehicle.id] ?? 0.0;
                              final isShared = vehicle.isShared || vehicle.name.toLowerCase().contains('share');

                              return InkWell(
                                onTap: () {
                                  context.read<BookingBloc>().add(SelectVehicle(vehicle));
                                },
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  margin: const EdgeInsets.symmetric(vertical: 5),
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? (isShared
                                            ? const Color(0xFF0165B7).withOpacity(0.04)
                                            : const Color(0xFF01A34D).withOpacity(0.04))
                                        : Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isSelected
                                          ? (isShared ? const Color(0xFF0165B7) : const Color(0xFF01A34D))
                                          : const Color(0xFFE2E7E9),
                                      width: isSelected ? 2 : 1,
                                    ),
                                  ),
                                  child: Column(
                                    children: [
                                      Row(
                                        children: [
                                          // Vehicle icon fallback
                                          Container(
                                            width: 48,
                                            height: 48,
                                            decoration: BoxDecoration(
                                              color: isShared
                                                  ? const Color(0xFF0165B7).withOpacity(0.12)
                                                  : (isSelected
                                                      ? const Color(0xFF01A34D).withOpacity(0.12)
                                                      : Colors.grey.shade100),
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: Icon(
                                              isShared ? Icons.groups_rounded : Icons.directions_car_filled_rounded,
                                              color: isShared
                                                  ? const Color(0xFF0165B7)
                                                  : (isSelected ? const Color(0xFF01A34D) : const Color(0xFF021B47)),
                                              size: 26,
                                            ),
                                          ),
                                          const SizedBox(width: 12),
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
                                                    if (isShared) ...[
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                        decoration: BoxDecoration(
                                                          color: const Color(0xFFE53935),
                                                          borderRadius: BorderRadius.circular(6),
                                                        ),
                                                        child: const Text(
                                                          'SAVE 40%',
                                                          style: TextStyle(
                                                            color: Colors.white,
                                                            fontSize: 9,
                                                            fontWeight: FontWeight.bold,
                                                          ),
                                                        ),
                                                      ),
                                                    ] else ...[
                                                      const Icon(Icons.person_rounded, size: 14, color: Colors.grey),
                                                      Text(
                                                        ' ${vehicle.capacity}',
                                                        style: const TextStyle(color: Colors.grey, fontSize: 12),
                                                      ),
                                                    ],
                                                  ],
                                                ),
                                                const SizedBox(height: 3),
                                                Text(
                                                  vehicle.description,
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
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
                                                style: TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.bold,
                                                  color: isShared ? const Color(0xFF0165B7) : const Color(0xFF021B47),
                                                ),
                                              ),
                                              Text(
                                                '${vehicle.etaMinutes} min away',
                                                style: const TextStyle(fontSize: 10, color: Color(0xFF8A94A6)),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),

                                      // Cab Sharing Seat Breakdown if selected
                                      if (isShared && isSelected) ...[
                                        const SizedBox(height: 10),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF0165B7).withOpacity(0.06),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: const [
                                              Row(
                                                children: [
                                                  Icon(Icons.event_seat_rounded, color: Color(0xFF0165B7), size: 14),
                                                  SizedBox(width: 6),
                                                  Text(
                                                    'Co-passengers: 2/3 Seats booked',
                                                    style: TextStyle(
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.bold,
                                                      color: Color(0xFF0165B7),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              Text(
                                                'Split Fare Active',
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                  color: Color(0xFF01A34D),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Payment section Row
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: InkWell(
                            onTap: () => context.push('/payment-methods'),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF7F9FC),
                                border: Border.all(color: const Color(0xFFE2E7E9)),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: const [
                                      Icon(Icons.payment_rounded, color: Color(0xFF021B47), size: 20),
                                      SizedBox(width: 10),
                                      Text(
                                        'Payment Method',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF021B47),
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Row(
                                    children: const [
                                      Icon(Icons.account_balance_wallet_rounded, color: Color(0xFF01A34D), size: 18),
                                      SizedBox(width: 6),
                                      Text(
                                        'Cash',
                                        style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF01A34D), fontSize: 13),
                                      ),
                                      SizedBox(width: 4),
                                      Icon(Icons.keyboard_arrow_down_rounded, color: Colors.grey, size: 18),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),

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
                                backgroundColor: state.selectedVehicle.isShared
                                    ? const Color(0xFF0165B7)
                                    : const Color(0xFF01A34D),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                elevation: 0,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Icon(
                                        state.selectedVehicle.isShared
                                            ? Icons.groups_rounded
                                            : Icons.directions_car_rounded,
                                        color: Colors.white,
                                        size: 22,
                                      ),
                                      const SizedBox(width: 10),
                                      Text(
                                        'Book ${state.selectedVehicle.name}',
                                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                  Text(
                                    '${AppConstants.currencySymbol}${(state.calculatedFares[state.selectedVehicle.id] ?? 0.0).toStringAsFixed(0)}',
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
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
