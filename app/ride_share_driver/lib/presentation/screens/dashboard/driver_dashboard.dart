import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../style/appcolors.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../injection_container.dart' as di;
import '../../../../features/dashboard/presentation/bloc/driver_status_bloc.dart';
import '../../../../features/ride/presentation/bloc/ride_bloc.dart';
import '../../../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../../../features/ride/presentation/screens/active_ride_screen.dart';
import '../../../../features/ride/domain/entities/active_ride.dart';
import '../../../../features/ride/domain/entities/ride_offer.dart';
import '../../../../features/profile/presentation/bloc/profile_bloc.dart';
import '../../../../features/wallet/presentation/bloc/wallet_bloc.dart';
import '../../../../features/ride_history/presentation/bloc/ride_history_bloc.dart';
import '../../../../features/ride/presentation/widgets/ride_request_card.dart';
import '../../../../common/entities/driver_dashboard_summary.dart';
import '../../../../core/storage/secure_storage.dart';
import 'widgets/pulsing_radar_view.dart';
import 'widgets/offline_mode_view.dart';

class DriverDashboard extends StatefulWidget {
  final VoidCallback onLogout;
  const DriverDashboard({super.key, required this.onLogout});

  @override
  State<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends State<DriverDashboard> {
  late final DriverStatusBloc _driverStatusBloc = di.sl<DriverStatusBloc>();
  late final RideBloc _rideBloc = di.sl<RideBloc>();
  late final AuthBloc _authBloc = di.sl<AuthBloc>();
  late final ProfileBloc _profileBloc = di.sl<ProfileBloc>();
  late final WalletBloc _walletBloc = di.sl<WalletBloc>();
  late final RideHistoryBloc _rideHistoryBloc = di.sl<RideHistoryBloc>();

  // Cached driver state so the map doesn't blank out during RideActionInProgress.
  LatLng? _lastKnownDriverPos;
  double _lastKnownBearing = 0.0;
  List<LatLng> _lastKnownTraveledPath = const [];

  @override
  void initState() {
    super.initState();
    _profileBloc.add(LoadProfile());
    _walletBloc.add(LoadWalletData());
    _rideHistoryBloc.add(LoadRideHistory());
    _restoreDriverOnlineStatus();
  }

  Future<void> _restoreDriverOnlineStatus() async {
    final storage = di.sl<SecureStorage>();
    final isOnlineStored = await storage.getOnlineStatus();
    final authState = _authBloc.state;
    final isOnlineAuth = (authState is Authenticated)
        ? authState.driver.isOnline
        : false;
    final isOnline = isOnlineStored ?? isOnlineAuth;
    if (isOnline) {
      _driverStatusBloc.add(GoOnlineRequested());
      _rideBloc.add(ConnectRideSocket());
    }
  }

  @override
  void dispose() {
    _driverStatusBloc.close();
    _rideBloc.close();
    _authBloc.close();
    _profileBloc.close();
    _walletBloc.close();
    _rideHistoryBloc.close();
    super.dispose();
  }

  Future<void> _confirmCancelRide(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Cancel this ride?'),
        content: const Text(
          'The ride will be offered to other nearby drivers instead.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('No'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Yes, cancel'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      _rideBloc.add(DriverCancelRequested());
    }
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
                fontSize: 18,
                fontWeight: FontWeight.bold,
                letterSpacing: 4,
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
            child: const Text('Cancel'),
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
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Start Trip'),
          ),
        ],
      ),
    );

    if (otp != null && otp.length == 4) {
      _rideBloc.add(StartRideRequested(otp: otp));
    }
  }

  void _toggleOnlineStatus(bool currentIsOnline) {
    if (currentIsOnline) {
      _driverStatusBloc.add(GoOfflineRequested());
    } else {
      _driverStatusBloc.add(GoOnlineRequested());
    }
  }

  String _getInitials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return 'DR';
    if (parts.length == 1) {
      return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
    }
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocListener(
      listeners: [
        BlocListener<DriverStatusBloc, DriverStatusState>(
          bloc: _driverStatusBloc,
          listener: (context, state) {
            if (state is DriverStatusError) {
              CustomToast.show(context, state.message);
            } else if (state is DriverStatusOnline) {
              CustomToast.show(context, 'You are now online');
              _rideBloc.add(ConnectRideSocket());
            } else if (state is DriverStatusOffline) {
              CustomToast.show(context, 'You are now offline');
              _rideBloc.add(DisconnectRideSocket());
            }
          },
        ),
        BlocListener<RideBloc, RideState>(
          bloc: _rideBloc,
          listener: (context, state) {
            if (state is RideOfferGone) {
              CustomToast.show(context, state.message);
            } else if (state is RideOperationFailed) {
              CustomToast.show(context, state.message);
            } else if (state is RideCancelledByRider) {
              CustomToast.show(context, state.message);
            }
          },
        ),
        BlocListener<ProfileBloc, ProfileState>(
          bloc: _profileBloc,
          listener: (context, state) async {
            if (state is ProfileLoaded) {
              final storage = di.sl<SecureStorage>();
              final isOnlineStored = await storage.getOnlineStatus();
              if (isOnlineStored == true) {
                final isOnlineApi =
                    state.summary?.isOnline ?? state.profile.isOnline;
                if (!isOnlineApi) {
                  _driverStatusBloc.add(GoOnlineRequested());
                } else {
                  _driverStatusBloc.add(RestoreOnlineStatus(isOnline: true));
                }
                _rideBloc.add(ConnectRideSocket());
              } else if (isOnlineStored == false) {
                _driverStatusBloc.add(RestoreOnlineStatus(isOnline: false));
                _rideBloc.add(DisconnectRideSocket());
              }
            }
          },
        ),
      ],
      child: BlocBuilder<AuthBloc, AuthState>(
        bloc: _authBloc,
        builder: (context, authState) {
          return BlocBuilder<ProfileBloc, ProfileState>(
            bloc: _profileBloc,
            builder: (context, profileState) {
              final summary = profileState is ProfileLoaded
                  ? profileState.summary
                  : null;
              final profile = profileState is ProfileLoaded
                  ? profileState.profile
                  : null;

              final driverName =
                  summary?.name ??
                  profile?.name ??
                  ((authState is Authenticated)
                      ? (authState.driver.name ?? 'Ramesh Kumar')
                      : 'Ramesh Kumar');
              final driverRating =
                  summary?.rating ??
                  (profile != null
                      ? profile.rating.toStringAsFixed(1)
                      : ((authState is Authenticated)
                            ? authState.driver.rating.toStringAsFixed(1)
                            : '5.0'));
              final profilePhoto =
                  summary?.profilePhoto ?? profile?.profilePhoto;

              return BlocBuilder<DriverStatusBloc, DriverStatusState>(
                bloc: _driverStatusBloc,
                builder: (context, statusState) {
                  final isOnline = statusState is DriverStatusOnline;

                  return BlocBuilder<RideBloc, RideState>(
                    bloc: _rideBloc,
                    builder: (context, rideState) {
                      ActiveRide? activeRide;
                      LatLng? driverPos;
                      double driverBearing = 0.0;
                      List<LatLng> traveledPath = const [];
                      bool isBusy = false;

                      if (rideState is RideActive) {
                        activeRide = rideState.ride;
                        driverPos = rideState.driverPosition;
                        driverBearing = rideState.driverBearing;
                        traveledPath = rideState.traveledPath;
                        // Cache the latest known driver state.
                        _lastKnownDriverPos = driverPos;
                        _lastKnownBearing = driverBearing;
                        _lastKnownTraveledPath = traveledPath;
                      } else if (rideState is RideActionInProgress) {
                        activeRide = rideState.ride;
                        isBusy = true;
                        // Keep map showing last known driver position while REST call is in flight.
                        driverPos = _lastKnownDriverPos;
                        driverBearing = _lastKnownBearing;
                        traveledPath = _lastKnownTraveledPath;
                      }

                      List<RideOffer> pendingOffers = [];
                      if (rideState is RideOfferPending) {
                        pendingOffers = rideState.offers;
                      }

                      return Scaffold(
                        backgroundColor: Colors.white,
                        drawer: _buildDrawer(
                          context,
                          driverName: driverName,
                          driverRating: driverRating,
                          profilePhoto: profilePhoto,
                        ),
                        appBar: AppBar(
                          backgroundColor: Colors.white,
                          elevation: 0,
                          scrolledUnderElevation: 0,
                          leading: Builder(
                            builder: (context) => IconButton(
                              icon: const Icon(
                                Icons.menu_rounded,
                                color: Color(0xFF021B47),
                                size: 26,
                              ),
                              onPressed: () =>
                                  Scaffold.of(context).openDrawer(),
                            ),
                          ),
                          centerTitle: true,
                          title: Image.asset(
                            'assets/images/ride-share-text-icon.png',
                            height: 28,
                            errorBuilder: (context, error, stackTrace) =>
                                const Text(
                                  'Ryva Ride',
                                  style: TextStyle(
                                    color: Color(0xFF009048),
                                    fontWeight: FontWeight.bold,
                                    fontSize: 20,
                                  ),
                                ),
                          ),
                          actions: [
                            Stack(
                              alignment: Alignment.center,
                              children: [
                                IconButton(
                                  icon: const Icon(
                                    Icons.notifications_none_rounded,
                                    color: Color(0xFF021B47),
                                    size: 26,
                                  ),
                                  onPressed: () =>
                                      context.push('/notifications'),
                                ),
                                Positioned(
                                  top: 14,
                                  right: 14,
                                  child: Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFF009048),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(width: 8),
                          ],
                        ),
                        body: Stack(
                          children: [
                            RefreshIndicator(
                              color: const Color(0xFF009048),
                              onRefresh: () async {
                                _profileBloc.add(LoadProfile());
                                _walletBloc.add(LoadWalletData());
                                _rideHistoryBloc.add(LoadRideHistory());
                              },
                              child: SingleChildScrollView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // 1. Top Header Row: [Avatar + Greeting/Name/Rating] [Pill Toggle Switch]
                                    _buildHeaderSection(
                                      context: context,
                                      driverName: driverName,
                                      driverRating: driverRating,
                                      profilePhoto: profilePhoto,
                                      isOnline: isOnline,
                                    ),

                                    const SizedBox(height: 16),

                                    // 2. Metrics Card: [Earnings] [Rides] [Working Hours]
                                    _buildMetricsSummaryCard(context, summary),

                                    const SizedBox(height: 20),

                                    // 3. Dynamic State Section
                                    if (!isOnline)
                                      // OFFLINE MODE
                                      Center(
                                        child: OfflineModeView(
                                          onGoOnline: () =>
                                              _toggleOnlineStatus(false),
                                        ),
                                      )
                                    else if (pendingOffers.isNotEmpty)
                                      // ONLINE - OFFERS AVAILABLE
                                      _buildOffersAvailableSection(
                                        pendingOffers,
                                      )
                                    else
                                      // SEARCHING FOR OFFERS
                                      _buildSearchingForOffersSection(),

                                    const SizedBox(height: 24),
                                  ],
                                ),
                              ),
                            ),

                            // Active Ride Full Overlay if ongoing trip
                            if (activeRide != null)
                              Positioned.fill(
                                child: ActiveRideScreen(
                                  ride: activeRide,
                                  driverPosition: driverPos,
                                  driverBearing: driverBearing,
                                  traveledPath: traveledPath,
                                  isBusy: isBusy,
                                  onMarkArriving: () =>
                                      _rideBloc.add(MarkArrivingRequested()),
                                  onStart: () =>
                                      _promptStartOtpAndDispatch(context),
                                  onComplete: () =>
                                      _rideBloc.add(CompleteRideRequested()),
                                  onCancel: () => _confirmCancelRide(context),
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  );
                },
              );
            },
          );
        },
      ),
    );
  }

  // ===========================================================================
  // Top Header Section: Profile + Greeting + Rating + Online/Offline Pill Switch
  // ===========================================================================
  Widget _buildHeaderSection({
    required BuildContext context,
    required String driverName,
    required String driverRating,
    String? profilePhoto,
    required bool isOnline,
  }) {
    final initials = _getInitials(driverName);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Driver Avatar & Name + Rating
        GestureDetector(
          onTap: () => Scaffold.of(context).openDrawer(),
          child: Row(
            children: [
              Stack(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(
                      color: Color(0xFF0F172A),
                      shape: BoxShape.circle,
                    ),
                    clipBehavior: Clip.antiAlias,
                    alignment: Alignment.center,
                    child: (profilePhoto != null && profilePhoto.isNotEmpty)
                        ? Image.network(
                            profilePhoto,
                            width: 48,
                            height: 48,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Text(
                              initials,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                              ),
                            ),
                          )
                        : Text(
                            initials,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: isOnline
                            ? const Color(0xFF009048)
                            : const Color(0xFF94A3B8),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _getGreeting(),
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Text(
                        driverName,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.star_rounded,
                              size: 13,
                              color: Color(0xFFD97706),
                            ),
                            const SizedBox(width: 2),
                            Text(
                              driverRating,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF92400E),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),

        // Online / Offline Pill Switch with smooth sliding animation
        GestureDetector(
          onTap: () => _toggleOnlineStatus(isOnline),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 280),
            curve: Curves.easeInOut,
            width: 92,
            height: 36,
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: isOnline
                  ? const Color(0xFF009048)
                  : const Color(0xFF64748B),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Stack(
              children: [
                AnimatedAlign(
                  duration: const Duration(milliseconds: 280),
                  curve: Curves.easeInOut,
                  alignment: isOnline
                      ? Alignment.centerLeft
                      : Alignment.centerRight,
                  child: Padding(
                    padding: EdgeInsets.only(
                      left: isOnline ? 10 : 0,
                      right: isOnline ? 0 : 10,
                    ),
                    child: Text(
                      isOnline ? 'Online' : 'Offline',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                AnimatedAlign(
                  duration: const Duration(milliseconds: 280),
                  curve: Curves.easeInOut,
                  alignment: isOnline
                      ? Alignment.centerRight
                      : Alignment.centerLeft,
                  child: Container(
                    width: 30,
                    height: 30,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black26,
                          blurRadius: 4,
                          offset: Offset(0, 1),
                        ),
                      ],
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

  // ===========================================================================
  // Metrics Card: [Today's Earnings] [Total Rides] [Working Hours]
  // ===========================================================================
  Widget _buildMetricsSummaryCard(
    BuildContext context,
    DriverDashboardSummary? summary,
  ) {
    final earningsStr = summary != null
        ? summary.today.totalEarnings.toStringAsFixed(0)
        : '0';
    final ridesCountStr = summary != null
        ? summary.today.totalRides.toString()
        : '0';
    final workingHoursStr = summary != null
        ? summary.today.formattedWorkingHours
        : '0m';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // 1. Today's Earnings
          Expanded(
            child: InkWell(
              onTap: () => context.push('/earnings'),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.account_balance_wallet_outlined,
                      color: Color(0xFF009048),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Earnings",
                          style: TextStyle(
                            fontSize: 11,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '₹$earningsStr',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Divider 1
          Container(width: 1, height: 32, color: const Color(0xFFE2E8F0)),

          // 2. Rides Today
          Expanded(
            child: InkWell(
              onTap: () => context.push('/ride-history'),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.directions_car_outlined,
                        color: Color(0xFF0F172A),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Rides',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            ridesCountStr,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Divider 2
          Container(width: 1, height: 32, color: const Color(0xFFE2E8F0)),

          // 3. Working Hours
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(left: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.schedule_outlined,
                      color: Color(0xFF2563EB),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Hours',
                          style: TextStyle(
                            fontSize: 11,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          workingHoursStr,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // State 1: ONLINE - OFFERS AVAILABLE
  // ===========================================================================
  Widget _buildOffersAvailableSection(List<RideOffer> offers) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header: "Ride Requests" [3 available]
        Row(
          children: [
            const Text(
              'Ride Requests',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFDCFCE7),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${offers.length} available',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF15803D),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        // List of all active incoming ride request cards
        ...offers.map(
          (offer) => RideRequestCard(
            key: ValueKey(offer.rideId),
            offer: offer,
            onAccept: (id) => _rideBloc.add(AcceptOfferRequested(rideId: id)),
            onDecline: (id) => _rideBloc.add(DeclineOfferRequested(rideId: id)),
            onExpired: (id) => _rideBloc.add(OfferExpiredLocally(rideId: id)),
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // State 2: SEARCHING FOR OFFERS (Center Radar Pulse)
  // ===========================================================================
  Widget _buildSearchingForOffersSection() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(height: 48),

          // Radar with vehicle in the center & pulse animation
          PulsingRadarView(),

          SizedBox(height: 36),

          // "Looking for ride requests..."
          Text(
            'Looking for ride requests...',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),

          SizedBox(height: 8),

          // Subtitle
          Text(
            "We'll notify you as soon as\na new request comes in.",
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              height: 1.4,
              color: Color(0xFF64748B),
            ),
          ),

          SizedBox(height: 48),
        ],
      ),
    );
  }

  // ===========================================================================
  // Drawer
  // ===========================================================================
  Widget _buildDrawer(
    BuildContext context, {
    required String driverName,
    required String driverRating,
    String? profilePhoto,
  }) {
    return Drawer(
      backgroundColor: Colors.white,
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.only(
              top: 60,
              left: 24,
              right: 24,
              bottom: 24,
            ),
            decoration: const BoxDecoration(color: Color(0xFF009048)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  clipBehavior: Clip.antiAlias,
                  alignment: Alignment.center,
                  child: (profilePhoto != null && profilePhoto.isNotEmpty)
                      ? Image.network(
                          profilePhoto,
                          width: 60,
                          height: 60,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.person,
                            color: Color(0xFF009048),
                            size: 34,
                          ),
                        )
                      : const Icon(
                          Icons.person,
                          color: Color(0xFF009048),
                          size: 34,
                        ),
                ),
                const SizedBox(height: 12),
                Text(
                  driverName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(
                      Icons.star_rounded,
                      color: Colors.amber,
                      size: 16,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      driverRating,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.home_rounded, color: Color(0xFF0F172A)),
            title: const Text(
              'Home',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            onTap: () {
              Navigator.pop(context);
              context.go('/dashboard');
            },
          ),
          ListTile(
            leading: const Icon(
              Icons.assignment_outlined,
              color: Color(0xFF0F172A),
            ),
            title: const Text(
              'Rides History',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            onTap: () {
              Navigator.pop(context);
              context.go('/ride-history');
            },
          ),
          ListTile(
            leading: const Icon(
              Icons.monetization_on_outlined,
              color: Color(0xFF0F172A),
            ),
            title: const Text(
              'Earnings',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            onTap: () {
              Navigator.pop(context);
              context.go('/earnings');
            },
          ),
          ListTile(
            leading: const Icon(
              Icons.account_balance_wallet_outlined,
              color: Color(0xFF0F172A),
            ),
            title: const Text(
              'Wallet',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            onTap: () {
              Navigator.pop(context);
              context.go('/wallet');
            },
          ),
          ListTile(
            leading: const Icon(
              Icons.person_outline_rounded,
              color: Color(0xFF0F172A),
            ),
            title: const Text(
              'Profile',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            onTap: () {
              Navigator.pop(context);
              context.go('/profile');
            },
          ),
          const Spacer(),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: Color(0xFFE53935)),
            title: const Text(
              'Logout',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Color(0xFFE53935),
              ),
            ),
            onTap: () {
              Navigator.pop(context);
              widget.onLogout();
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
