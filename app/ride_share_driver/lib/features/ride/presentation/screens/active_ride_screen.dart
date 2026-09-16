import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter/services.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../injection_container.dart' as di;
import '../../data/datasources/ride_remote_datasource.dart';
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
  late final RideRemoteDataSource _dataSource = di.sl<RideRemoteDataSource>();
  Timer? _waitingTimer;
  int _waitingSeconds = 0;

  void _updateWaitingTimer(String status) {
    if (status == 'arrived') {
      _waitingTimer ??= Timer.periodic(const Duration(seconds: 1), (timer) {
        if (mounted) {
          setState(() {
            _waitingSeconds++;
          });
        }
      });
    } else {
      _waitingTimer?.cancel();
      _waitingTimer = null;
      _waitingSeconds = 0;
    }
  }

  String _formatWaitingDuration(int totalSec) {
    final m = (totalSec ~/ 60).toString().padLeft(2, '0');
    final s = (totalSec % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  void dispose() {
    _waitingTimer?.cancel();
    super.dispose();
  }

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

  void _confirmCancelRide(BuildContext context, ActiveRide ride) {
    final isArrived = ride.status == 'arrived';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Cancel this trip?',
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Are you sure you want to cancel? This may affect your driver rating and completion rate.',
              style: TextStyle(fontSize: 14),
            ),
            if (isArrived) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.info_outline_rounded, color: Color(0xFFD97706), size: 18),
                        SizedBox(width: 6),
                        Text(
                          'Passenger didn\'t show up?',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFB45309)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Use Passenger No-Show to receive waiting fee compensation instead of penalty.',
                      style: TextStyle(fontSize: 11, color: Color(0xFF92400E)),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      height: 36,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          _showNoShowDialog(context, ride);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD97706),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                        ),
                        child: const Text('Declare No-Show Instead', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
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

  void _showSosDialog(BuildContext context, ActiveRide ride, LatLng? driverPos) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).padding.bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFDE8E8),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.shield_rounded, color: Color(0xFFE53935), size: 28),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Emergency SOS Alert',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Ryva 24/7 Driver Safety Ops',
                        style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.warning_amber_rounded, color: Color(0xFFE53935), size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Activating SOS will immediately alert Ryva Safety Operations, transmit your live GPS coordinates, and notify emergency contacts.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF991B1B),
                        height: 1.35,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Trip ID', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      Text(
                        '#${ride.id.substring(0, math.min(8, ride.id.length)).toUpperCase()}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Live Coordinates', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      Text(
                        driverPos != null
                            ? '${driverPos.latitude.toStringAsFixed(4)}, ${driverPos.longitude.toStringAsFixed(4)}'
                            : '${ride.pickupLat.toStringAsFixed(4)}, ${ride.pickupLng.toStringAsFixed(4)}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  if (ride.riderName != null) ...[
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Passenger', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        Text(
                          ride.riderName!,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  _rideBloc.add(DriverSosRequested(
                    lat: driverPos?.latitude,
                    lng: driverPos?.longitude,
                  ));
                },
                icon: const Icon(Icons.emergency_rounded, color: Colors.white, size: 20),
                label: const Text(
                  'TRIGGER EMERGENCY SOS',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE53935),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  _shareLiveTripStatus(context, ride);
                },
                icon: const Icon(Icons.share_location_rounded, color: Color(0xFF009048), size: 20),
                label: const Text(
                  'SHARE LIVE TRIP STATUS',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF009048)),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF009048), width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Cancel / False Alarm', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _shareLiveTripStatus(BuildContext context, ActiveRide ride) async {
    try {
      final res = await _dataSource.generateShareToken(ride.id);
      final token = res['token']?.toString() ?? '';
      final trackingUrl = 'https://ryva.app/tracking/public/$token';

      await Clipboard.setData(ClipboardData(text: trackingUrl));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Live trip tracking link copied to clipboard!\n$trackingUrl'),
            backgroundColor: const Color(0xFF009048),
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to share trip status: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showNoShowDialog(BuildContext context, ActiveRide ride) {
    String selectedReason = 'rider_not_at_pickup';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      backgroundColor: Colors.white,
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.person_off_rounded, color: Color(0xFFD97706), size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Passenger No-Show',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Declare passenger didn\'t arrive at pickup',
                              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.check_circle_rounded, color: Color(0xFF009048), size: 20),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'You will receive standard cancellation fee compensation for your waiting time.',
                            style: TextStyle(fontSize: 12, color: Color(0xFF166534), fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Select Reason',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                  ),
                  const SizedBox(height: 8),
                  ...[
                    {'id': 'rider_not_at_pickup', 'label': 'Passenger did not arrive at pickup spot'},
                    {'id': 'rider_unreachable', 'label': 'Unable to contact passenger (phone / chat)'},
                    {'id': 'rider_refused_ride', 'label': 'Passenger refused or asked to cancel'},
                  ].map((item) {
                    final isSelected = selectedReason == item['id'];
                    return InkWell(
                      onTap: () => setModalState(() => selectedReason = item['id']!),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                              color: isSelected ? const Color(0xFF009048) : const Color(0xFF94A3B8),
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                item['label']!,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                  color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF475569),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () => Navigator.of(sheetCtx).pop(),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            foregroundColor: const Color(0xFF64748B),
                          ),
                          child: const Text('Keep Waiting', style: TextStyle(fontWeight: FontWeight.w600)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.of(sheetCtx).pop();
                            _rideBloc.add(DriverNoShowRequested(reason: selectedReason));
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFD97706),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Confirm No-Show', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
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
        } else if (state is RideNoShowSuccess) {
          final feeMinor = state.feeMinor;
          final feeNum = feeMinor / 100.0;
          final fee = feeNum.toStringAsFixed(2);

          showModalBottomSheet(
            context: context,
            isDismissible: false,
            enableDrag: false,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (sheetCtx) => _buildNoShowCompletionSheet(sheetCtx, fee),
          );
        } else if (state is RideSosSuccess) {
          CustomToast.show(context, state.message);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFFE53935),
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 6),
              content: Row(
                children: [
                  const Icon(Icons.shield_rounded, color: Colors.white),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      state.message,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
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
        _updateWaitingTimer(ride.status);
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
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Center(
                  child: InkWell(
                    onTap: () => _showSosDialog(context, ride, driverPosition),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFDE8E8),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFF87171), width: 1.5),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.shield_rounded, color: Color(0xFFE53935), size: 16),
                          SizedBox(width: 4),
                          Text(
                            'SOS',
                            style: TextStyle(
                              color: Color(0xFFE53935),
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
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
                                      ? 'Waiting at Pickup (${_formatWaitingDuration(_waitingSeconds)})'
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

              // 2.5 Floating Chat Shortcut FAB over map
              Positioned(
                right: 16,
                bottom: 340,
                child: FloatingActionButton(
                  heroTag: 'active_ride_chat_fab',
                  backgroundColor: const Color(0xFF009048),
                  mini: true,
                  onPressed: () {
                    context.push('/ride-chat', extra: {
                      'rideId': ride.id,
                      'riderName': ride.riderName ?? 'Passenger',
                    });
                  },
                  child: const Icon(Icons.chat_bubble_rounded, color: Colors.white, size: 20),
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
                              const SizedBox(width: 8),
                              OutlinedButton.icon(
                                onPressed: () => _showSosDialog(context, ride, driverPosition),
                                icon: const Icon(Icons.shield_rounded, size: 15, color: Color(0xFFE53935)),
                                label: const Text('SOS', style: TextStyle(color: Color(0xFFE53935), fontWeight: FontWeight.bold, fontSize: 12)),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: Color(0xFFFECACA)),
                                  backgroundColor: const Color(0xFFFEF2F2),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
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

                        if (ride.status == 'arrived') ...[
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: OutlinedButton.icon(
                              onPressed: isActionInProgress ? null : () => _showNoShowDialog(context, ride),
                              icon: const Icon(Icons.person_off_rounded, size: 18, color: Color(0xFFD97706)),
                              label: const Text(
                                'Passenger No-Show',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFFB45309),
                                ),
                              ),
                              style: OutlinedButton.styleFrom(
                                backgroundColor: const Color(0xFFFFFBEB),
                                side: const BorderSide(color: Color(0xFFFCD34D), width: 1.2),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                        ],

                        if (ride.status != 'started') ...[
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: TextButton(
                              onPressed: () => _confirmCancelRide(context, ride),
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

  Widget _buildNoShowCompletionSheet(BuildContext sheetCtx, String fee) {
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
          Container(
            width: 48,
            height: 5,
            decoration: BoxDecoration(
              color: const Color(0xFFCBD5E1),
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          const SizedBox(height: 18),
          Container(
            width: 68,
            height: 68,
            decoration: const BoxDecoration(
              color: Color(0xFFFEF3C7),
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(
                Icons.person_off_rounded,
                color: Color(0xFFD97706),
                size: 38,
              ),
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Passenger No-Show Confirmed',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F172A),
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'The trip has been cancelled. Waiting compensation has been credited to your earnings.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
              height: 1.3,
            ),
          ),
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFDCFCE7)),
            ),
            child: Column(
              children: [
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.account_balance_wallet_outlined, color: Color(0xFF009048), size: 18),
                    SizedBox(width: 6),
                    Text(
                      'NO-SHOW COMPENSATION CREDITED',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                        color: Color(0xFF009048),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '₹$fee',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF009048),
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: () {
                Navigator.of(sheetCtx).pop();
                _rideBloc.add(AcknowledgeCompletionRequested());
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
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text(
                'Done — Back to Dashboard',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
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
