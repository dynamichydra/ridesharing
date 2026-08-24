import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../bloc/booking_bloc.dart';
import '../../../ride_tracking/presentation/bloc/ride_tracking_bloc.dart';
import '../../../wallet/presentation/bloc/wallet_bloc.dart';

class RideOptionsPage extends StatefulWidget {
  const RideOptionsPage({super.key});

  @override
  State<RideOptionsPage> createState() => _RideOptionsPageState();
}

class _RideOptionsPageState extends State<RideOptionsPage> {
  bool _isConfirmStep = false;
  bool _isBooking = false;
  String _paymentMethod = 'Cash'; // 'Cash' or 'Wallet'
  BookingVehicleOptionsLoaded? _cachedOptions;

  @override
  void initState() {
    super.initState();
    context.read<WalletBloc>().add(LoadWalletDetails());
  }

  String _getVehicleAsset(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('bike') || lower.contains('moto') || lower.contains('two')) {
      return 'assets/icons/bike.png';
    } else if (lower.contains('auto') || lower.contains('rickshaw')) {
      return 'assets/icons/auto.png';
    } else if (lower.contains('premium') || lower.contains('xl') || lower.contains('luxury')) {
      return 'assets/icons/premium-car.png';
    } else {
      return 'assets/icons/car.png';
    }
  }

  void _showInsufficientWalletSnackbar(BuildContext context, double walletBalance, double requiredAmount) {
    CustomToast.show(context, 'Not enough balance in your wallet');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final walletState = context.watch<WalletBloc>().state;
    double walletBalance = 0.0;
    if (walletState is WalletLoaded) {
      walletBalance = walletState.balance;
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          _isConfirmStep ? 'Confirm Your Ride' : 'Choose a ride',
          style: const TextStyle(color: Color(0xFF021B47), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF021B47), size: 20),
          onPressed: () {
            if (_isConfirmStep) {
              setState(() {
                _isConfirmStep = false;
              });
            } else {
              context.read<BookingBloc>().add(ClearBooking());
              context.pop();
            }
          },
        ),
      ),
      body: BlocConsumer<BookingBloc, BookingState>(
        listener: (context, state) {
          if (state is BookingVehicleOptionsLoaded) {
            setState(() {
              _cachedOptions = state;
            });
          } else if (state is BookingConfirmed) {
            setState(() {
              _isBooking = false;
            });
            context.read<RideTrackingBloc>().add(
                  StartRideTracking(
                    rideId: state.rideId,
                    pickup: state.pickup,
                    pickupName: state.pickupName,
                    destination: state.destination,
                    destinationName: state.destinationName,
                    vehicleName: state.selectedVehicle.name,
                    fare: state.fare,
                    paymentMethod: state.paymentMethod,
                  ),
                );
            context.go('/ride-tracking');
          } else if (state is BookingError) {
            setState(() {
              _isBooking = false;
            });
            CustomToast.show(context, state.message);
          }
        },
        builder: (context, state) {
          final effectiveState = (state is BookingVehicleOptionsLoaded)
              ? state
              : _cachedOptions;

          if (effectiveState == null && state is BookingLoading) {
            return const LoadingView();
          }

          if (effectiveState == null && state is BookingError) {
            return ErrorView(
              message: state.message,
              onRetry: () => context.pop(),
            );
          }

          if (effectiveState != null) {
            final data = effectiveState;
            return _isConfirmStep
                ? _buildConfirmRideView(context, data, walletBalance)
                : _buildChooseRideView(context, data, walletBalance);
          }

          return const LoadingView();
        },
      ),
    );
  }

  // ===========================================================================
  // Screen 2: Choose a ride (Available Ride Options)
  // ===========================================================================
  Widget _buildChooseRideView(BuildContext context, BookingVehicleOptionsLoaded state, double walletBalance) {
    final selectedPrice = state.calculatedFares[state.selectedVehicle.id] ?? state.selectedVehicle.baseFare;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Vehicle Option Cards
                Column(
                  children: state.vehicles.map((vehicle) {
                    final isSelected = state.selectedVehicle.id == vehicle.id;
                    final price = state.calculatedFares[vehicle.id] ?? vehicle.baseFare;
                    final assetPath = _getVehicleAsset(vehicle.name);

                    return InkWell(
                      onTap: () {
                        context.read<BookingBloc>().add(SelectVehicle(vehicle));
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF009048) : const Color(0xFFE2E7E9),
                            width: isSelected ? 2 : 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: isSelected ? 0.04 : 0.02),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            // Vehicle Image
                            SizedBox(
                              width: 68,
                              height: 52,
                              child: Image.asset(
                                assetPath,
                                fit: BoxFit.contain,
                                errorBuilder: (context, error, stackTrace) => Container(
                                  width: 52,
                                  height: 52,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(Icons.directions_car_filled_rounded, color: Color(0xFF009048), size: 28),
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),

                            // Details
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    vehicle.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                      color: Color(0xFF021B47),
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${vehicle.capacity} Passenger${vehicle.capacity > 1 ? 's' : ''}',
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF8A94A6)),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${vehicle.etaMinutes} min away • 18 min',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                                  ),
                                ],
                              ),
                            ),

                            // Price and Radio
                            Row(
                              children: [
                                Text(
                                  '${AppConstants.currencySymbol}${price.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF021B47),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                                  color: isSelected ? const Color(0xFF009048) : Colors.grey.shade300,
                                  size: 20,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 18),

                // Payment Method Section
                const Text(
                  'Payment Method',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF021B47),
                  ),
                ),
                const SizedBox(height: 10),

                // 2 Payment options side-by-side
                Row(
                  children: [
                    // Cash Option
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          setState(() {
                            _paymentMethod = 'Cash';
                          });
                        },
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: _paymentMethod == 'Cash' ? const Color(0xFF009048) : const Color(0xFFE2E7E9),
                              width: _paymentMethod == 'Cash' ? 1.8 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                _paymentMethod == 'Cash' ? Icons.radio_button_checked : Icons.radio_button_off,
                                color: _paymentMethod == 'Cash' ? const Color(0xFF009048) : Colors.grey.shade400,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Cash', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                                    SizedBox(height: 1),
                                    Text('Pay to driver', style: TextStyle(fontSize: 10, color: Color(0xFF8A94A6))),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),

                    // Wallet Option
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          if (walletBalance < selectedPrice) {
                            _showInsufficientWalletSnackbar(context, walletBalance, selectedPrice);
                            return;
                          }
                          setState(() {
                            _paymentMethod = 'Wallet';
                          });
                        },
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: _paymentMethod == 'Wallet' ? const Color(0xFF009048) : const Color(0xFFE2E7E9),
                              width: _paymentMethod == 'Wallet' ? 1.8 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.account_balance_wallet_rounded,
                                color: Color(0xFF021B47),
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Wallet', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                                    const SizedBox(height: 1),
                                    Text(
                                      'Balance: ₹${walletBalance.toStringAsFixed(2)}',
                                      style: const TextStyle(fontSize: 10, color: Color(0xFF8A94A6)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),

        // Bottom Continue Bar
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () {
                      if (_paymentMethod == 'Wallet' && walletBalance < selectedPrice) {
                        _showInsufficientWalletSnackbar(context, walletBalance, selectedPrice);
                        return;
                      }
                      setState(() {
                        _isConfirmStep = true;
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF009048),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: const Text('Continue', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${AppConstants.currencySymbol}${selectedPrice.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF021B47),
                    ),
                  ),
                  const Text(
                    'Total',
                    style: TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // Screen 3: Confirm Your Ride
  // ===========================================================================
  Widget _buildConfirmRideView(BuildContext context, BookingVehicleOptionsLoaded state, double walletBalance) {
    final price = state.calculatedFares[state.selectedVehicle.id] ?? state.selectedVehicle.baseFare;
    final double baseFare = (price * 0.75).clamp(20.0, price);
    final double distanceFare = (price * 0.18).clamp(5.0, price);
    final double timeFare = (price - baseFare - distanceFare).clamp(0.0, price);
    final assetPath = _getVehicleAsset(state.selectedVehicle.name);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Selected Vehicle Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E7E9)),
            ),
            child: Row(
              children: [
                SizedBox(
                  width: 68,
                  height: 52,
                  child: Image.asset(
                    assetPath,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: const Color(0xFF009048).withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.directions_car_filled_rounded, color: Color(0xFF009048), size: 28),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        state.selectedVehicle.name,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${state.selectedVehicle.capacity} Passenger${state.selectedVehicle.capacity > 1 ? 's' : ''}',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF8A94A6)),
                      ),
                    ],
                  ),
                ),
                Text(
                  '${AppConstants.currencySymbol}${price.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 2. Route Summary Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E7E9)),
            ),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 4),
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(color: Color(0xFF009048), shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Pickup', style: TextStyle(fontSize: 11, color: Color(0xFF8A94A6))),
                          Text(
                            state.pickupName.isNotEmpty ? state.pickupName : 'Pickup Location',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF021B47)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 4),
                  child: Row(
                    children: [
                      Container(height: 18, width: 2, color: Colors.grey.shade300),
                    ],
                  ),
                ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 4),
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(color: Color(0xFFE53935), shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Drop-off', style: TextStyle(fontSize: 11, color: Color(0xFF8A94A6))),
                          Text(
                            state.destinationName.isNotEmpty ? state.destinationName : 'Destination Location',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF021B47)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(),
                const SizedBox(height: 6),
                const Row(
                  children: [
                    Icon(Icons.near_me_rounded, size: 14, color: Color(0xFF8A94A6)),
                    SizedBox(width: 4),
                    Text('6.2 km', style: TextStyle(fontSize: 12, color: Color(0xFF8A94A6))),
                    SizedBox(width: 16),
                    Icon(Icons.access_time_rounded, size: 14, color: Color(0xFF8A94A6)),
                    SizedBox(width: 4),
                    Text('18 min', style: TextStyle(fontSize: 12, color: Color(0xFF8A94A6))),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 3. Fare Details Card
          const Text(
            'Fare Details',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
          ),
          const SizedBox(height: 10),

          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E7E9)),
            ),
            child: Column(
              children: [
                _buildFareRow('Base Fare', '₹${baseFare.toStringAsFixed(0)}'),
                const SizedBox(height: 8),
                _buildFareRow('Distance (6.2 km)', '₹${distanceFare.toStringAsFixed(0)}'),
                const SizedBox(height: 8),
                _buildFareRow('Time (18 min)', '₹${timeFare.toStringAsFixed(0)}'),
                const SizedBox(height: 10),
                const Divider(),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Fare', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                    Text('₹${price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF009048))),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 4. Payment Method Card
          const Text(
            'Payment Method',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
          ),
          const SizedBox(height: 10),

          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E7E9)),
            ),
            child: Row(
              children: [
                Icon(
                  _paymentMethod == 'Cash' ? Icons.payments_rounded : Icons.account_balance_wallet_rounded,
                  color: const Color(0xFF009048),
                  size: 22,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _paymentMethod == 'Cash' ? 'Cash' : 'Wallet',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                      ),
                      Text(
                        _paymentMethod == 'Cash' ? 'Pay to driver' : 'Balance: ₹${walletBalance.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () {
                    final targetMethod = _paymentMethod == 'Cash' ? 'Wallet' : 'Cash';
                    if (targetMethod == 'Wallet' && walletBalance < price) {
                      _showInsufficientWalletSnackbar(context, walletBalance, price);
                      return;
                    }
                    setState(() {
                      _paymentMethod = targetMethod;
                    });
                  },
                  child: const Text('Change', style: TextStyle(color: Color(0xFF0065B3), fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 5. Confirm & Book Primary Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _isBooking
                  ? null
                  : () {
                      final chosenMethod = _paymentMethod.toLowerCase();
                      if (chosenMethod == 'wallet' && walletBalance < price) {
                        _showInsufficientWalletSnackbar(context, walletBalance, price);
                        return;
                      }

                      setState(() {
                        _isBooking = true;
                      });
                      context.read<BookingBloc>().add(ConfirmRideBooking(paymentMethod: chosenMethod));
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF009048),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: _isBooking
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                    )
                  : const Text(
                      'Confirm & Book',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
            ),
          ),
          const SizedBox(height: 12),

          Center(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _isConfirmStep = false;
                });
              },
              child: const Text(
                'Cancel Ride',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFE53935),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFareRow(String title, String amount) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 13, color: Color(0xFF8A94A6))),
        Text(amount, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF021B47))),
      ],
    );
  }
}
