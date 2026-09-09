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
      case 'arriving':
        return 'Heading to Pickup';
      case 'arrived':
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
      case 'arriving':
        return "I've Arrived";
      case 'arrived':
        return 'Enter OTP & Start Trip';
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
          final fareNum = fareMinor / 100.0;
          final fare = fareNum.toStringAsFixed(2);
          final isWallet = state.ride.paymentMethod?.toLowerCase() == 'wallet';

          showModalBottomSheet(
            context: context,
            isDismissible: false,
            enableDrag: false,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (sheetCtx) => _buildCompletionSheet(sheetCtx, state.ride, fare, isWallet),
          );
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
        // Extract ride from RideActive or RideActionInProgress
        final ActiveRide rideData;
        final LatLng? driverPosition;
        final double driverBearing;
        final List<LatLng> traveledPath;
        final bool isActionInProgress;

        if (state is RideActive) {
          rideData = state.ride;
          driverPosition = state.driverPosition;
          driverBearing = state.driverBearing;
          traveledPath = state.traveledPath;
          isActionInProgress = false;
        } else if (state is RideActionInProgress) {
          rideData = state.ride;
          driverPosition = null;
          driverBearing = 0.0;
          traveledPath = const [];
          isActionInProgress = true;
        } else {
          return const Scaffold(
            backgroundColor: Colors.white,
            body: Center(
              child: CircularProgressIndicator(color: Color(0xFF009048)),
            ),
          );
        }

        final ride = rideData;
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
                                  : (ride.status == 'arrived'
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
                                  : (ride.status == 'arrived'
                                      ? 'Ask passenger for 4-digit start OTP'
                                      : 'Follow live route to passenger'),
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
                          margin: const EdgeInsets.only(bottom: 14),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade300,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),

                        // Passenger Card with Chat button
                        Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.02),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 20,
                                backgroundColor: const Color(0xFFE2E8F0),
                                backgroundImage: ride.riderAvatar != null && ride.riderAvatar!.isNotEmpty
                                    ? NetworkImage(ride.riderAvatar!)
                                    : null,
                                child: ride.riderAvatar == null || ride.riderAvatar!.isEmpty
                                    ? const Icon(Icons.person_rounded, color: Color(0xFF64748B), size: 22)
                                    : null,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      ride.riderName ?? 'Passenger',
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        const Icon(Icons.star_rounded, size: 14, color: Colors.amber),
                                        const SizedBox(width: 2),
                                        Text(
                                          '${(ride.riderRating ?? 5.0).toStringAsFixed(1)} • Passenger',
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              ElevatedButton.icon(
                                onPressed: () {
                                  context.push('/ride-chat', extra: {
                                    'rideId': ride.id,
                                    'name': ride.riderName ?? 'Passenger',
                                    'avatar': ride.riderAvatar,
                                    'phone': ride.riderPhone,
                                  });
                                },
                                icon: const Icon(Icons.chat_bubble_rounded, size: 16),
                                label: const Text('Chat'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFE8F5E9),
                                  foregroundColor: const Color(0xFF009048),
                                  elevation: 0,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                ),
                              ),
                            ],
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
                            onPressed: isActionInProgress
                                ? null
                                : () {
                                    if (ride.status == 'accepted' || ride.status == 'arriving') {
                                      _rideBloc.add(MarkArrivedRequested());
                                    } else if (ride.status == 'arrived') {
                                      _promptStartOtpAndDispatch(context);
                                    } else if (ride.status == 'started') {
                                      _rideBloc.add(CompleteRideRequested());
                                    }
                                  },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF009048),
                              foregroundColor: Colors.white,
                              disabledBackgroundColor: const Color(0xFF009048).withOpacity(0.6),
                              disabledForegroundColor: Colors.white70,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              elevation: 0,
                            ),
                            child: isActionInProgress
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.5,
                                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                    ),
                                  )
                                : Text(
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

  Widget _buildCompletionSheet(BuildContext sheetCtx, ActiveRide ride, String fare, bool isWallet) {
    // Determine the amounts
    final int promoMinor = ride.promoDiscountMinor ?? 0;
    final bool hasPromo = promoMinor > 0;
    final int finalFareMinor = ride.finalFareMinor ?? ride.estimatedFareMinor ?? 0;
    final int grossFareMinor = ride.grossFareMinor ?? (finalFareMinor + promoMinor);

    final double grossFareNum = grossFareMinor / 100.0;
    final double riderPayableNum = finalFareMinor / 100.0;
    final double promoIncentiveNum = promoMinor / 100.0;

    // Driver earnings & commission
    final int commissionMinor = ride.commissionMinor ?? (grossFareMinor * 0.2).round();
    final int calculatedEarnings = grossFareMinor - commissionMinor;
    final int driverEarningsMinor = ride.driverEarningsMinor ?? (calculatedEarnings > 0 ? calculatedEarnings : 0);

    final double commissionNum = commissionMinor / 100.0;
    final double driverEarningsNum = driverEarningsMinor / 100.0;

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 20,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Container(
            width: 48,
            height: 5,
            decoration: BoxDecoration(
              color: const Color(0xFFCBD5E1),
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          const SizedBox(height: 18),

          // Green circle check icon
          Container(
            width: 68,
            height: 68,
            decoration: const BoxDecoration(
              color: Color(0xFFDCFCE7),
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(
                Icons.check_rounded,
                color: Color(0xFF009048),
                size: 42,
              ),
            ),
          ),
          const SizedBox(height: 14),

          const Text(
            'Ride Completed!',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F172A),
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            isWallet
                ? 'Your net earnings have been credited to your Ryva Wallet.'
                : 'Please collect ₹${riderPayableNum.toStringAsFixed(riderPayableNum % 1 == 0 ? 0 : 2)} from the rider.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF64748B),
              height: 1.3,
            ),
          ),
          const SizedBox(height: 18),

          // Main Action Card (Collect Cash or Wallet Credited)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
            decoration: BoxDecoration(
              color: isWallet ? const Color(0xFFF0FDF4) : const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isWallet ? const Color(0xFFDCFCE7) : const Color(0xFFFDE68A),
              ),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      isWallet ? Icons.account_balance_wallet_outlined : Icons.payments_outlined,
                      color: isWallet ? const Color(0xFF009048) : const Color(0xFFB45309),
                      size: 18,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isWallet ? 'YOUR NET EARNINGS (WALLET)' : 'COLLECT CASH FROM RIDER',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                        color: isWallet ? const Color(0xFF009048) : const Color(0xFFB45309),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  isWallet
                      ? '₹${driverEarningsNum.toStringAsFixed(2)}'
                      : '₹${riderPayableNum.toStringAsFixed(riderPayableNum % 1 == 0 ? 0 : 2)}',
                  style: TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                    color: isWallet ? const Color(0xFF009048) : const Color(0xFF92400E),
                    letterSpacing: -0.5,
                  ),
                ),
                if (!isWallet && hasPromo) ...[
                  const SizedBox(height: 2),
                  Text(
                    '(Total fare: ₹${grossFareNum.toStringAsFixed(grossFareNum % 1 == 0 ? 0 : 2)})',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF78350F),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Earnings Preview Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Earnings Preview',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 12),
                _buildBreakdownRow(
                  label: isWallet ? 'Total Fare' : 'Fare paid by rider',
                  amount: '₹${(isWallet ? grossFareNum : riderPayableNum).toStringAsFixed(2)}',
                ),
                if (hasPromo) ...[
                  const SizedBox(height: 8),
                  _buildBreakdownRow(
                    label: 'Promo incentive (from Ryva)',
                    amount: '+ ₹${promoIncentiveNum.toStringAsFixed(2)}',
                    amountColor: const Color(0xFF009048),
                  ),
                ],
                const SizedBox(height: 8),
                _buildBreakdownRow(
                  label: 'Platform commission',
                  amount: '- ₹${commissionNum.toStringAsFixed(2)}',
                  amountColor: const Color(0xFFDC2626),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Divider(height: 1, color: Color(0xFFE2E8F0)),
                ),
                _buildBreakdownRow(
                  label: 'Your Net Earnings',
                  amount: '₹${driverEarningsNum.toStringAsFixed(2)}',
                  isBold: true,
                  amountColor: const Color(0xFF009048),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Disclaimer Note for Promo Incentive or Settlement
          if (!isWallet && hasPromo)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.info_outline_rounded,
                    size: 16,
                    color: Color(0xFFD97706),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Promo incentive of ₹${promoIncentiveNum.toStringAsFixed(2)} will be added to your wallet after ride completion.',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFFB45309),
                        height: 1.35,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 18),

          // Done Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: () {
                Navigator.of(sheetCtx).pop();
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/dashboard');
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF009048),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                isWallet ? 'Done' : 'Cash Collected — Done',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBreakdownRow({
    required String label,
    required String amount,
    bool isBold = false,
    Color? amountColor,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: isBold ? const Color(0xFF0F172A) : const Color(0xFF64748B),
            fontWeight: isBold ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        Text(
          amount,
          style: TextStyle(
            fontSize: 13,
            color: amountColor ?? (isBold ? const Color(0xFF0F172A) : const Color(0xFF334155)),
            fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
          ),
        ),
      ],
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
