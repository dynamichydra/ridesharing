import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../style/appcolors.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../injection_container.dart' as di;
import '../../../../features/dashboard/presentation/bloc/driver_status_bloc.dart';
import '../../../../features/ride/presentation/bloc/ride_bloc.dart';
import '../../../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../../../features/ride/presentation/widgets/ride_offer_overlay.dart';
import '../../../../features/ride/presentation/screens/active_ride_screen.dart';
import '../../../../features/ride/domain/entities/active_ride.dart';
import '../../../../features/profile/presentation/bloc/profile_bloc.dart';
import '../../../../features/wallet/presentation/bloc/wallet_bloc.dart';
import '../../../../features/ride_history/presentation/bloc/ride_history_bloc.dart';

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

  // Driver stats data
  final double _todayEarnings = 1250.0;
  final int _completedRidesCount = 12;
  final String _onlineHoursStr = '8h 32m';
  final double _driverRating = 4.8;

  final int _currentProgressRides = 12;
  final int _targetProgressRides = 20;
  final int _bonusAmount = 400;

  @override
  void initState() {
    super.initState();
    _profileBloc.add(LoadProfile());
    _walletBloc.add(LoadWalletData());
    _rideHistoryBloc.add(LoadRideHistory());
    final authState = _authBloc.state;
    if (authState is Authenticated && authState.driver.isOnline) {
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
        content: const Text('The ride will be offered to other nearby drivers instead.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(dialogContext).pop(false), child: const Text('No')),
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
        title: const Text('Enter Rider OTP', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Ask the rider for their 4-digit start OTP to begin the trip.', style: TextStyle(fontSize: 14)),
            const SizedBox(height: 16),
            TextField(
              controller: otpController,
              keyboardType: TextInputType.number,
              maxLength: 4,
              autofocus: true,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 4),
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                labelText: '4-Digit OTP',
                hintText: '1234',
                counterText: '',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
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
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
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
            }
          },
        ),
      ],
      child: BlocBuilder<AuthBloc, AuthState>(
        bloc: _authBloc,
        builder: (context, authState) {
          final driverName = (authState is Authenticated) ? (authState.driver.name ?? 'Driver') : 'Driver';
          final profilePhoto = (authState is Authenticated) ? authState.driver.profilePhoto : null;

          return BlocBuilder<DriverStatusBloc, DriverStatusState>(
            bloc: _driverStatusBloc,
            builder: (context, statusState) {
              final isOnline = statusState is DriverStatusOnline;

              return BlocBuilder<RideBloc, RideState>(
                bloc: _rideBloc,
                builder: (context, rideState) {
                  ActiveRide? activeRide;
                  if (rideState is RideActive) {
                    activeRide = rideState.ride;
                  }

                  return Scaffold(
                    backgroundColor: Colors.white,
                    drawer: _buildDrawer(
                      context,
                      driverName: driverName,
                      driverRating: _driverRating.toString(),
                      profilePhoto: profilePhoto,
                    ),
                    appBar: AppBar(
                      backgroundColor: Colors.white,
                      elevation: 0,
                      leading: Builder(
                        builder: (context) => IconButton(
                          icon: const Icon(Icons.menu_rounded, color: Color(0xFF021B47), size: 26),
                          onPressed: () => Scaffold.of(context).openDrawer(),
                        ),
                      ),
                      centerTitle: true,
                      title: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Image.asset(
                            'assets/images/ride-share-text-icon.png',
                            height: 28,
                            errorBuilder: (context, error, stackTrace) => const Text(
                              'Ryva Ride',
                              style: TextStyle(
                                color: Color(0xFF009048),
                                fontWeight: FontWeight.bold,
                                fontSize: 20,
                              ),
                            ),
                          ),
                        ],
                      ),
                      actions: [
                        Stack(
                          alignment: Alignment.center,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.notifications_none_rounded, color: Color(0xFF021B47), size: 26),
                              onPressed: () => context.push('/notifications'),
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
                          onRefresh: () async {
                            _profileBloc.add(LoadProfile());
                            _walletBloc.add(LoadWalletData());
                            _rideHistoryBloc.add(LoadRideHistory());
                          },
                          child: SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // 1. Online / Offline Toggle Card
                                _buildOnlineStatusCard(isOnline),
                                const SizedBox(height: 16),

                                // 2. Today's Overview
                                _buildTodaysOverviewCard(),
                                const SizedBox(height: 16),

                                // 3. Incentive Progress Card
                                _buildIncentiveProgressCard(),
                                const SizedBox(height: 16),

                                // 4. Recent Ride Card
                                _buildRecentRideCard(),
                                const SizedBox(height: 24),

                                // 5. Go Offline / Go Online Action Button
                                SizedBox(
                                  width: double.infinity,
                                  height: 52,
                                  child: ElevatedButton.icon(
                                    onPressed: () => _toggleOnlineStatus(isOnline),
                                    icon: const Icon(Icons.power_settings_new_rounded, size: 20),
                                    label: Text(
                                      isOnline ? 'Go Offline' : 'Go Online',
                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isOnline ? const Color(0xFF009048) : const Color(0xFF021B47),
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                      elevation: 0,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 20),
                              ],
                            ),
                          ),
                        ),

                        // Active Ride Full Overlay if ongoing trip
                        if (activeRide != null)
                          Positioned.fill(
                            child: ActiveRideScreen(
                              ride: activeRide,
                              isBusy: false,
                              onMarkArriving: () => _rideBloc.add(MarkArrivingRequested()),
                              onStart: () => _promptStartOtpAndDispatch(context),
                              onComplete: () => _rideBloc.add(CompleteRideRequested()),
                              onCancel: () => _confirmCancelRide(context),
                            ),
                          ),

                        // Ride Offer Modal Overlay when pinged with a new booking
                        if (rideState is RideOfferPending)
                          RideOfferOverlay.multi(
                            offers: rideState.offers,
                            onAccept: (id) => _rideBloc.add(AcceptOfferRequested(rideId: id)),
                            onDecline: (id) => _rideBloc.add(DeclineOfferRequested(rideId: id)),
                            onExpired: (id) => _rideBloc.add(OfferExpiredLocally(rideId: id)),
                          ),
                      ],
                    ),
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
  // UI Component 1: Online Status Card (Green Hero)
  // ===========================================================================
  Widget _buildOnlineStatusCard(bool isOnline) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: isOnline ? const Color(0xFF009048) : const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: (isOnline ? const Color(0xFF009048) : Colors.black).withValues(alpha: 0.15),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: isOnline ? const Color(0xFF4ADE80) : Colors.grey.shade400,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isOnline ? "You're Online" : "You're Offline",
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isOnline ? 'Receiving ride requests' : 'Go online to receive requests',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ],
          ),
          InkWell(
            onTap: () => _toggleOnlineStatus(isOnline),
            borderRadius: BorderRadius.circular(20),
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.20),
              ),
              child: const Icon(
                Icons.power_settings_new_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // UI Component 2: Today's Overview Card
  // ===========================================================================
  Widget _buildTodaysOverviewCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E7E9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Today's Overview",
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF021B47),
                ),
              ),
              GestureDetector(
                onTap: () => context.push('/earnings'),
                child: const Text(
                  'View details >',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF0065B3),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildOverviewMetric('$_completedRidesCount', 'Rides'),
              _buildOverviewDivider(),
              _buildOverviewMetric('₹${_todayEarnings.toStringAsFixed(0)}', 'Earnings'),
              _buildOverviewDivider(),
              _buildOverviewMetric(_onlineHoursStr, 'Online Hours'),
              _buildOverviewDivider(),
              _buildOverviewMetric('$_driverRating ★', 'Rating'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewMetric(String val, String label) {
    return Column(
      children: [
        Text(
          val,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: Color(0xFF021B47),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF8A94A6),
          ),
        ),
      ],
    );
  }

  Widget _buildOverviewDivider() {
    return Container(
      width: 1,
      height: 28,
      color: const Color(0xFFE2E7E9),
    );
  }

  // ===========================================================================
  // UI Component 3: Incentive Progress Card
  // ===========================================================================
  Widget _buildIncentiveProgressCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E7E9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Complete $_targetProgressRides rides to earn ₹$_bonusAmount extra incentive',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF021B47),
                  ),
                ),
              ),
              const Text('🎁', style: TextStyle(fontSize: 20)),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: _currentProgressRides / _targetProgressRides,
              minHeight: 8,
              backgroundColor: const Color(0xFFF1F5F9),
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF009048)),
            ),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              '$_currentProgressRides / $_targetProgressRides Rides',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF8A94A6)),
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // UI Component 4: Recent Ride Card
  // ===========================================================================
  Widget _buildRecentRideCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E7E9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Recent Ride',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF021B47),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.circle, color: Color(0xFF009048), size: 10),
                        SizedBox(width: 8),
                        Text(
                          'Koramangala',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF021B47)),
                        ),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(left: 4),
                      child: Row(
                        children: [
                          Container(height: 14, width: 2, color: Colors.grey.shade300),
                        ],
                      ),
                    ),
                    Row(
                      children: const [
                        Icon(Icons.circle, color: Color(0xFFE53935), size: 10),
                        SizedBox(width: 8),
                        Text(
                          'Electronic City',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF021B47)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text(
                    '₹125',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Today, 07:45 AM',
                    style: TextStyle(fontSize: 10, color: Color(0xFF8A94A6)),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE6F4EA),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'Completed',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF009048)),
                    ),
                  ),
                ],
              ),
            ],
          ),
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
            padding: const EdgeInsets.only(top: 60, left: 24, right: 24, bottom: 24),
            decoration: const BoxDecoration(
              color: Color(0xFF009048),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white,
                  child: const Icon(Icons.person, color: Color(0xFF009048), size: 34),
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
                    const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
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
            leading: const Icon(Icons.home_rounded, color: Color(0xFF021B47)),
            title: const Text('Home', style: TextStyle(fontWeight: FontWeight.w600)),
            onTap: () {
              Navigator.pop(context);
              context.go('/dashboard');
            },
          ),
          ListTile(
            leading: const Icon(Icons.assignment_outlined, color: Color(0xFF021B47)),
            title: const Text('Rides History', style: TextStyle(fontWeight: FontWeight.w600)),
            onTap: () {
              Navigator.pop(context);
              context.go('/ride-history');
            },
          ),
          ListTile(
            leading: const Icon(Icons.monetization_on_outlined, color: Color(0xFF021B47)),
            title: const Text('Earnings', style: TextStyle(fontWeight: FontWeight.w600)),
            onTap: () {
              Navigator.pop(context);
              context.go('/earnings');
            },
          ),
          ListTile(
            leading: const Icon(Icons.account_balance_wallet_outlined, color: Color(0xFF021B47)),
            title: const Text('Wallet', style: TextStyle(fontWeight: FontWeight.w600)),
            onTap: () {
              Navigator.pop(context);
              context.go('/wallet');
            },
          ),
          ListTile(
            leading: const Icon(Icons.person_outline_rounded, color: Color(0xFF021B47)),
            title: const Text('Profile', style: TextStyle(fontWeight: FontWeight.w600)),
            onTap: () {
              Navigator.pop(context);
              context.go('/profile');
            },
          ),
          const Spacer(),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: Color(0xFFE53935)),
            title: const Text('Logout', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFE53935))),
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
