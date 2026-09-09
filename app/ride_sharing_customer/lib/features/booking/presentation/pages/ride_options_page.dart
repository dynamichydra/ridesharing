import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../../domain/entities/passenger_info.dart';
import '../widgets/passenger_details_sheet.dart';
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
  bool _isBookingForSomeoneElse = false;
  PassengerInfo? _passenger;
  String? _rideNotes;

  @override
  void initState() {
    super.initState();
    context.read<WalletBloc>().add(LoadWalletDetails());
  }

  void _openPassengerSheet(BuildContext context) {
    PassengerDetailsSheet.show(
      context: context,
      initialPassenger: _passenger,
      initialNotes: _rideNotes,
      onSaved: (passenger, notes) {
        setState(() {
          _isBookingForSomeoneElse = true;
          _passenger = passenger;
          _rideNotes = notes;
        });
      },
    );
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
                    passenger: state.passenger,
                    trackingUrl: state.trackingUrl,
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

          if (state is BookingError || (effectiveState == null && state is! BookingLoading)) {
            final errorMsg = state is BookingError ? state.message : 'No rides are currently available in this area.';
            return Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE53935).withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.no_crash_rounded,
                        color: Color(0xFFE53935),
                        size: 40,
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'No Rides Available',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF021B47),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      errorMsg,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF8A94A6),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 28),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: () {
                          context.read<BookingBloc>().add(ClearBooking());
                          context.pop();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF009048),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          elevation: 0,
                        ),
                        child: const Text(
                          'Choose Another Location',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          if (effectiveState != null) {
            final data = effectiveState;
            if (data.vehicles.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE53935).withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.no_crash_rounded,
                          color: Color(0xFFE53935),
                          size: 40,
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'No Rides Available',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF021B47),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'There are no drivers currently available for this route.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          color: Color(0xFF8A94A6),
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 28),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: () {
                            context.read<BookingBloc>().add(ClearBooking());
                            context.pop();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF009048),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 0,
                          ),
                          child: const Text(
                            'Choose Another Location',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

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
  // Rider Selector (For Me vs Someone Else)
  // ===========================================================================
  Widget _buildRiderSelector(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: const Color(0xFFE2E8F0),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              // For Me Tab
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    if (_isBookingForSomeoneElse) {
                      setState(() {
                        _isBookingForSomeoneElse = false;
                      });
                    }
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: !_isBookingForSomeoneElse ? Colors.white : Colors.transparent,
                      borderRadius: BorderRadius.circular(11),
                      boxShadow: !_isBookingForSomeoneElse
                          ? [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.06),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              )
                            ]
                          : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.person_rounded,
                          size: 17,
                          color: !_isBookingForSomeoneElse ? const Color(0xFF009048) : const Color(0xFF64748B),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'For Me',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: !_isBookingForSomeoneElse ? FontWeight.bold : FontWeight.w500,
                            color: !_isBookingForSomeoneElse ? const Color(0xFF021B47) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // Someone Else Tab
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _isBookingForSomeoneElse = true;
                    });
                    if (_passenger == null) {
                      _openPassengerSheet(context);
                    }
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _isBookingForSomeoneElse ? Colors.white : Colors.transparent,
                      borderRadius: BorderRadius.circular(11),
                      boxShadow: _isBookingForSomeoneElse
                          ? [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.06),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              )
                            ]
                          : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.people_alt_rounded,
                          size: 17,
                          color: _isBookingForSomeoneElse ? const Color(0xFF009048) : const Color(0xFF64748B),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'For Someone Else',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: _isBookingForSomeoneElse ? FontWeight.bold : FontWeight.w500,
                            color: _isBookingForSomeoneElse ? const Color(0xFF021B47) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Passenger Details Card (if Someone Else selected)
        if (_isBookingForSomeoneElse) ...[
          const SizedBox(height: 10),
          _passenger != null
              ? Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFF009048).withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF009048).withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.person_pin_rounded, color: Color(0xFF009048), size: 20),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    _passenger!.name,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF021B47)),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF009048),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    _passenger!.passengerType.toUpperCase(),
                                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${_passenger!.phoneCountryCode} ${_passenger!.phoneNumber}',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                            if (_rideNotes != null && _rideNotes!.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                'Note: "$_rideNotes"',
                                style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Color(0xFF475569)),
                              ),
                            ],
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          _openPassengerSheet(context);
                        },
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF0165B7),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('Edit', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ],
                  ),
                )
              : InkWell(
                  onTap: () => _openPassengerSheet(context),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF009048), width: 1.2),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add_circle_outline_rounded, size: 18, color: Color(0xFF009048)),
                        SizedBox(width: 8),
                        Text(
                          'Add Passenger Details',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF009048),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
        ],
      ],
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
                // Who is riding selector (For Me vs Someone Else)
                _buildRiderSelector(context),
                const SizedBox(height: 14),

                // Vehicle Option Cards
                Column(
                  children: state.vehicles.map((vehicle) {
                    final isSelected = state.selectedVehicle.id == vehicle.id;
                    final price = state.calculatedFares[vehicle.id] ?? vehicle.baseFare;
                    final origPrice = (state.originalFares ?? state.calculatedFares)[vehicle.id] ?? vehicle.baseFare;
                    final bool hasDiscount = state.appliedPromoCode != null && origPrice > price;
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
                                      if (hasDiscount) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFE8F5E9),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            'Save ₹${(origPrice - price).toStringAsFixed(0)}',
                                            style: const TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF009048),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
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
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    if (hasDiscount)
                                      Text(
                                        '${AppConstants.currencySymbol}${origPrice.toStringAsFixed(0)}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Color(0xFF8A94A6),
                                          decoration: TextDecoration.lineThrough,
                                        ),
                                      ),
                                    Text(
                                      '${AppConstants.currencySymbol}${price.toStringAsFixed(0)}',
                                      style: TextStyle(
                                        fontSize: 17,
                                        fontWeight: FontWeight.bold,
                                        color: hasDiscount ? const Color(0xFF009048) : const Color(0xFF021B47),
                                      ),
                                    ),
                                  ],
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
                const SizedBox(height: 12),

                // Promo / Coupon Banner on Choose Ride Step
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: state.appliedPromoCode != null
                          ? const Color(0xFF009048).withValues(alpha: 0.4)
                          : const Color(0xFFE2E7E9),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: state.appliedPromoCode != null
                      ? Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(7),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE8F5E9),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.check_circle_rounded, color: Color(0xFF009048), size: 18),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          state.appliedPromoCode!,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF009048),
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF009048),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: const Text(
                                            'APPLIED',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 1),
                                    Text(
                                      state.discountAmount != null && state.discountAmount! > 0
                                          ? 'Discount of ₹${state.discountAmount!.toStringAsFixed(0)} applied'
                                          : (state.promoDescription ?? 'Coupon applied'),
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                ),
                              ),
                              TextButton(
                                onPressed: () {
                                  context.read<BookingBloc>().add(RemovePromoCode());
                                  CustomToast.show(context, 'Promo code removed');
                                },
                                style: TextButton.styleFrom(
                                  foregroundColor: const Color(0xFFE53935),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: const Text('Remove', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                        )
                      : InkWell(
                          onTap: () {
                            context.push('/promo-codes');
                          },
                          borderRadius: BorderRadius.circular(16),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(7),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF009048).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.local_offer_rounded, color: Color(0xFF009048), size: 18),
                                ),
                                const SizedBox(width: 12),
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Have a promo code?',
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF021B47),
                                        ),
                                      ),
                                      Text(
                                        'Apply coupon to get an instant discount',
                                        style: TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                                      ),
                                    ],
                                  ),
                                ),
                                const Text(
                                  'Apply',
                                  style: TextStyle(
                                    color: Color(0xFF009048),
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF009048), size: 12),
                              ],
                            ),
                          ),
                        ),
                ),
                const SizedBox(height: 14),

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
                      if (_isBookingForSomeoneElse && _passenger == null) {
                        CustomToast.show(context, 'Please enter passenger details');
                        _openPassengerSheet(context);
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
                  Builder(builder: (context) {
                    final origPrice = (state.originalFares ?? state.calculatedFares)[state.selectedVehicle.id] ?? state.selectedVehicle.baseFare;
                    final bool hasDiscount = state.appliedPromoCode != null && origPrice > selectedPrice;
                    return Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (hasDiscount) ...[
                          Text(
                            '${AppConstants.currencySymbol}${origPrice.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF8A94A6),
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                          const SizedBox(width: 4),
                        ],
                        Text(
                          '${AppConstants.currencySymbol}${selectedPrice.toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: hasDiscount ? const Color(0xFF009048) : const Color(0xFF021B47),
                          ),
                        ),
                      ],
                    );
                  }),
                  Builder(builder: (context) {
                    final origPrice = (state.originalFares ?? state.calculatedFares)[state.selectedVehicle.id] ?? state.selectedVehicle.baseFare;
                    final bool hasDiscount = state.appliedPromoCode != null && origPrice > selectedPrice;
                    return Text(
                      hasDiscount ? 'Total (Saved ₹${(origPrice - selectedPrice).toStringAsFixed(0)})' : 'Total',
                      style: TextStyle(
                        fontSize: 11,
                        color: hasDiscount ? const Color(0xFF009048) : const Color(0xFF8A94A6),
                        fontWeight: hasDiscount ? FontWeight.bold : FontWeight.normal,
                      ),
                    );
                  }),
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
                Builder(builder: (context) {
                  final origPrice = (state.originalFares ?? state.calculatedFares)[state.selectedVehicle.id] ?? state.selectedVehicle.baseFare;
                  final bool hasDiscount = state.appliedPromoCode != null && origPrice > price;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (hasDiscount)
                        Text(
                          '${AppConstants.currencySymbol}${origPrice.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF8A94A6),
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                      Text(
                        '${AppConstants.currencySymbol}${price.toStringAsFixed(0)}',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: hasDiscount ? const Color(0xFF009048) : const Color(0xFF021B47),
                        ),
                      ),
                    ],
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Passenger Details Card (when booking for someone else)
          if (_isBookingForSomeoneElse && _passenger != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFF009048).withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF009048).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.people_alt_rounded, color: Color(0xFF009048), size: 18),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Text(
                          'Riding on Behalf',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                        ),
                      ),
                      TextButton(
                        onPressed: () => _openPassengerSheet(context),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF0165B7),
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('Edit', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _passenger!.name,
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${_passenger!.phoneCountryCode} ${_passenger!.phoneNumber} • ${_passenger!.passengerType[0].toUpperCase()}${_passenger!.passengerType.substring(1)}',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (_rideNotes != null && _rideNotes!.trim().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.speaker_notes_outlined, size: 14, color: Color(0xFF64748B)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Note: ${_rideNotes!.trim()}',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF475569), fontStyle: FontStyle.italic),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),
          ],

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
                if (state.discountAmount != null && state.discountAmount! > 0) ...[
                  const SizedBox(height: 8),
                  _buildFareRow(
                    'Promo Discount',
                    '-₹${state.discountAmount!.toStringAsFixed(0)}',
                    color: const Color(0xFF009048),
                  ),
                ],
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
          
          // Promo Code Row on Confirm Ride Screen
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: state.appliedPromoCode != null
                    ? const Color(0xFF009048).withValues(alpha: 0.4)
                    : const Color(0xFFE2E7E9),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  state.appliedPromoCode != null ? Icons.check_circle_rounded : Icons.local_offer_rounded,
                  color: const Color(0xFF009048),
                  size: 22,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: () {
                      context.push('/promo-codes');
                    },
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              state.appliedPromoCode != null ? state.appliedPromoCode! : 'Promo Code',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: state.appliedPromoCode != null ? const Color(0xFF009048) : const Color(0xFF021B47),
                              ),
                            ),
                            if (state.appliedPromoCode != null) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF009048),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'APPLIED',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          state.appliedPromoCode != null
                              ? (state.discountAmount != null && state.discountAmount! > 0
                                  ? 'Saved ₹${state.discountAmount!.toStringAsFixed(0)} on this ride'
                                  : (state.promoDescription ?? 'Promo applied'))
                              : 'Apply a promo code for discount',
                          style: TextStyle(
                            fontSize: 11,
                            color: state.appliedPromoCode != null ? const Color(0xFF64748B) : const Color(0xFF8A94A6),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                if (state.appliedPromoCode != null)
                  TextButton(
                    onPressed: () {
                      context.read<BookingBloc>().add(RemovePromoCode());
                      CustomToast.show(context, 'Promo code removed');
                    },
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFFE53935),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text('Remove', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  )
                else
                  IconButton(
                    onPressed: () {
                      context.push('/promo-codes');
                    },
                    icon: const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF8A94A6), size: 16),
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
                      if (_isBookingForSomeoneElse && _passenger == null) {
                        CustomToast.show(context, 'Please enter passenger details');
                        _openPassengerSheet(context);
                        return;
                      }

                      setState(() {
                        _isBooking = true;
                      });
                      context.read<BookingBloc>().add(
                            ConfirmRideBooking(
                              paymentMethod: chosenMethod,
                              passenger: _isBookingForSomeoneElse ? _passenger : null,
                              notes: _isBookingForSomeoneElse ? _rideNotes : null,
                            ),
                          );
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

  Widget _buildFareRow(String title, String amount, {Color color = const Color(0xFF021B47)}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 13, color: Color(0xFF8A94A6))),
        Text(amount, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: color)),
      ],
    );
  }
}
