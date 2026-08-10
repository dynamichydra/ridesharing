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
import '../../../../features/profile/presentation/pages/profile_page.dart';
import '../../../../features/profile/presentation/bloc/profile_bloc.dart';
import '../../../../common/entities/driver_profile.dart';
import '../../../../features/wallet/presentation/pages/wallet_page.dart';
import '../../../../features/ride_history/presentation/pages/ride_history_page.dart';
import '../../../../features/wallet/presentation/bloc/wallet_bloc.dart';
import '../../../../features/ride_history/presentation/bloc/ride_history_bloc.dart';
import '../settings/settings_page.dart';

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

  int _selectedNavIndex = 0;

  // Driver stats data
  final double _todayEarnings = 2450.75;
  final int _completedRidesCount = 8;
  final String _onlineHoursStr = '8:45 hrs';
  final int _totalRidesToday = 12;
  final double _avgPerRide = 230.0;

  final int _currentProgressRides = 12;
  final int _targetProgressRides = 20;
  final int _bonusAmount = 800;

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
            onPressed: () => Navigator.pop(ctx, null),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final text = otpController.text.trim();
              if (text.length == 4) {
                Navigator.pop(ctx, text);
              } else {
                CustomToast.show(context, 'Please enter a valid 4-digit OTP');
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Start Trip'),
          ),
        ],
      ),
    );

    if (otp != null && otp.isNotEmpty) {
      _rideBloc.add(StartRideRequested(otp: otp));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<RideBloc, RideState>(
      bloc: _rideBloc,
      listener: (context, rideState) {
        if (rideState is RideOperationFailed) {
          CustomToast.show(context, rideState.message);
        } else if (rideState is RideOfferGone) {
          CustomToast.show(context, rideState.message);
        } else if (rideState is RideCancelledByRider) {
          CustomToast.show(context, rideState.message);
        }
      },
      builder: (context, rideState) {
        if (rideState is RideActive || rideState is RideActionInProgress) {
          final ActiveRide ride = rideState is RideActive ? rideState.ride : (rideState as RideActionInProgress).ride;
          return ActiveRideScreen(
            ride: ride,
            driverPosition: rideState is RideActive ? rideState.driverPosition : null,
            driverBearing: rideState is RideActive ? rideState.driverBearing : 0.0,
            traveledPath: rideState is RideActive ? rideState.traveledPath : const [],
            isBusy: rideState is RideActionInProgress,
            onMarkArriving: () => _rideBloc.add(MarkArrivingRequested()),
            onStart: () => _promptStartOtpAndDispatch(context),
            onComplete: () => _rideBloc.add(CompleteRideRequested()),
            onCancel: () => _confirmCancelRide(context),
          );
        }

        if (rideState is RideCompleted) {
          return _buildCompletedScreen(rideState.ride);
        }

        return Stack(
          children: [
            _buildDashboard(context),
            if (rideState is RideOfferPending)
              RideOfferOverlay.multi(
                offers: rideState.offers,
                onAccept: (rideId) => _rideBloc.add(AcceptOfferRequested(rideId: rideId)),
                onDecline: (rideId) => _rideBloc.add(DeclineOfferRequested(rideId: rideId)),
                onExpired: (rideId) => _rideBloc.add(OfferExpiredLocally(rideId: rideId)),
              ),
            if (rideState is RideAccepting)
              Container(
                color: Colors.black26,
                child: const Center(child: CircularProgressIndicator()),
              ),
          ],
        );
      },
    );
  }

  Widget _buildCompletedScreen(ActiveRide ride) {
    final minor = ride.finalFareMinor ?? ride.estimatedFareMinor ?? 0;
    final currency = ride.currencyCode ?? '';
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle_rounded, color: Color(0xFF005CE6), size: 64),
                const SizedBox(height: 16),
                const Text(
                  'Trip Completed',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                ),
                const SizedBox(height: 8),
                Text(
                  '$currency ${(minor / 100).toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF005CE6)),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => _rideBloc.add(AcknowledgeCompletionRequested()),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF005CE6),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: const Text('Done'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDashboard(BuildContext context) {
    return BlocBuilder<ProfileBloc, ProfileState>(
      bloc: _profileBloc,
      builder: (context, profileState) {
        return BlocConsumer<AuthBloc, AuthState>(
          bloc: _authBloc,
          listener: (context, authState) {
            if (authState is Authenticated && authState.driver.isOnline) {
              _rideBloc.add(ConnectRideSocket());
            }
          },
          builder: (context, authState) {
            DriverProfile? driver;
            if (profileState is ProfileLoaded) {
              driver = profileState.profile;
            } else if (profileState is ProfileUpdateSuccess) {
              driver = profileState.profile;
            } else if (authState is Authenticated) {
              driver = authState.driver;
            }

            final name = driver?.name?.trim();
            final phone = driver?.phone?.trim();
            final email = driver?.email?.trim();

            final String driverName = (name != null && name.isNotEmpty)
                ? name
                : (phone != null && phone.isNotEmpty)
                    ? phone
                    : 'Driver Partner';

            final String driverRating = driver != null ? driver.rating.toStringAsFixed(1) : '5.0';
            final String? profilePhoto = driver?.profilePhoto;
            final String subTitleText = (email != null && email.isNotEmpty)
                ? email
                : (phone ?? '');

            return BlocConsumer<DriverStatusBloc, DriverStatusState>(
              bloc: _driverStatusBloc,
              listener: (context, state) {
                if (state is DriverStatusError) {
                  CustomToast.show(context, state.message);
                } else if (state is DriverStatusOnline) {
                  _rideBloc.add(ConnectRideSocket());
                } else if (state is DriverStatusOffline) {
                  _rideBloc.add(DisconnectRideSocket());
                }
              },
          builder: (context, state) {
            final isOnline = state is DriverStatusOnline;
            final isTransitioning = state is DriverStatusTransitioning;

            return Scaffold(
              backgroundColor: const Color(0xFFF8FAFC),
              appBar: AppBar(
                backgroundColor: const Color(0xFFF8FAFC),
                elevation: 0,
                centerTitle: true,
                leading: Builder(
                  builder: (ctx) => IconButton(
                    icon: const Icon(Icons.menu, color: Color(0xFF1E293B), size: 24),
                    onPressed: () => Scaffold.of(ctx).openDrawer(),
                  ),
                ),
                title: const Text(
                  'Dashboard',
                  style: TextStyle(
                    color: Color(0xFF1E293B),
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
                actions: [
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.notifications_none_rounded, color: Color(0xFF1E293B), size: 26),
                        onPressed: () {},
                      ),
                      Positioned(
                        top: 14,
                        right: 14,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 4),
                ],
              ),
              drawer: _buildDrawer(
                context,
                driverName: driverName,
                driverRating: driverRating,
                profilePhoto: profilePhoto,
                subTitleText: subTitleText,
              ),
              body: SafeArea(
                child: RefreshIndicator(
                  onRefresh: () async {
                    _profileBloc.add(LoadProfile());
                    _walletBloc.add(LoadWalletData());
                    _rideHistoryBloc.add(LoadRideHistory());
                  },
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                      // Driver Profile Header Row
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: const Color(0xFF0052CC).withOpacity(0.1),
                              border: Border.all(color: const Color(0xFF0052CC).withOpacity(0.3), width: 1.5),
                              image: (profilePhoto != null && profilePhoto.isNotEmpty)
                                  ? DecorationImage(
                                      image: NetworkImage(profilePhoto),
                                      fit: BoxFit.cover,
                                    )
                                  : null,
                            ),
                            child: (profilePhoto == null || profilePhoto.isEmpty)
                                ? Center(
                                    child: Text(
                                      driverName.isNotEmpty ? driverName[0].toUpperCase() : 'D',
                                      style: const TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0052CC),
                                      ),
                                    ),
                                  )
                                : null,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Good Morning,',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF64748B),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  driverName,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    color: Color(0xFF0F172A),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Icon(Icons.star_rounded, color: Colors.amber, size: 18),
                                    const SizedBox(width: 4),
                                    Text(
                                      driverRating,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF475569),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          // Online / Offline Switch Pill Button
                          InkWell(
                            onTap: isTransitioning
                                ? null
                                : () {
                                    if (isOnline) {
                                      _driverStatusBloc.add(GoOfflineRequested());
                                    } else {
                                      _driverStatusBloc.add(GoOnlineRequested());
                                    }
                                  },
                            borderRadius: BorderRadius.circular(24),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 250),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: isOnline ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE),
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(
                                  color: isOnline ? const Color(0xFFC8E6C9) : const Color(0xFFFFCDD2),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (isTransitioning)
                                    const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  else
                                    Icon(
                                      isOnline ? Icons.arrow_drop_down : Icons.arrow_drop_up,
                                      color: isOnline ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                                      size: 20,
                                    ),
                                  const SizedBox(width: 4),
                                  Text(
                                    isOnline ? 'Online' : 'Offline',
                                    style: TextStyle(
                                      color: isOnline ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Today's Earnings Card with dynamic WalletBloc & RideHistoryBloc data
                      BlocBuilder<WalletBloc, WalletState>(
                        bloc: _walletBloc,
                        builder: (context, walletState) {
                          double earnings = _todayEarnings;
                          String currency = '₹';
                          if (walletState is WalletLoaded && walletState.walletInfo != null) {
                            earnings = walletState.walletInfo!.balanceAmount;
                            currency = walletState.walletInfo!.currencyCode == 'USD' ? '\$' : '₹';
                          }

                          return BlocBuilder<RideHistoryBloc, RideHistoryState>(
                            bloc: _rideHistoryBloc,
                            builder: (context, historyState) {
                              int completedCount = _completedRidesCount;
                              int totalRides = _totalRidesToday;
                              if (historyState is RideHistoryLoaded) {
                                completedCount = historyState.rides.where((r) => r['status'] == 'completed').length;
                                totalRides = historyState.rides.length;
                              }
                              double avgPerRide = completedCount > 0 ? (earnings / completedCount) : 0.0;

                              return Column(
                                children: [
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(20),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0052CC),
                                      borderRadius: BorderRadius.circular(20),
                                      boxShadow: [
                                        BoxShadow(
                                          color: const Color(0xFF0052CC).withValues(alpha: 0.3),
                                          blurRadius: 16,
                                          offset: const Offset(0, 8),
                                        ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          "Today's Earnings",
                                          style: TextStyle(
                                            color: Colors.white70,
                                            fontSize: 14,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              '$currency${earnings.toStringAsFixed(2)}',
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 32,
                                                fontWeight: FontWeight.bold,
                                                letterSpacing: -0.5,
                                              ),
                                            ),
                                            IconButton(
                                              onPressed: () {
                                                Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletPage()));
                                              },
                                              icon: const Icon(Icons.chevron_right_rounded, color: Colors.white, size: 28),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        Text(
                                          '$completedCount Rides Completed',
                                          style: TextStyle(
                                            color: Colors.white.withValues(alpha: 0.9),
                                            fontSize: 14,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 16),

                                  // Stats Summary Box
                                  Container(
                                    padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 12),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(color: const Color(0xFFF1F5F9)),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.02),
                                          blurRadius: 10,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: _buildSummaryStatItem(
                                            title: _onlineHoursStr,
                                            label: 'Online Hours',
                                          ),
                                        ),
                                        Container(width: 1, height: 36, color: const Color(0xFFE2E8F0)),
                                        Expanded(
                                          child: _buildSummaryStatItem(
                                            title: '$totalRides',
                                            label: 'Rides',
                                          ),
                                        ),
                                        Container(width: 1, height: 36, color: const Color(0xFFE2E8F0)),
                                        Expanded(
                                          child: _buildSummaryStatItem(
                                            title: '$currency${avgPerRide.toInt()}',
                                            label: 'Avg. per Ride',
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            },
                          );
                        },
                      ),
                      const SizedBox(height: 16),

                      // Today's Progress Card
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFF1F5F9)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.02),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
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
                                  "Today's Progress",
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () {},
                                  child: const Text(
                                    'View details',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF0052CC),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                RichText(
                                  text: TextSpan(
                                    children: [
                                      TextSpan(
                                        text: '$_currentProgressRides ',
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF16A34A),
                                        ),
                                      ),
                                      TextSpan(
                                        text: '/ $_targetProgressRides Rides',
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF475569),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '${((_currentProgressRides / _targetProgressRides) * 100).toInt()}%',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: LinearProgressIndicator(
                                value: _currentProgressRides / _targetProgressRides,
                                minHeight: 8,
                                backgroundColor: const Color(0xFFF1F5F9),
                                valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF16A34A)),
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              'Complete ${_targetProgressRides - _currentProgressRides} more rides to get ₹$_bonusAmount bonus',
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Quick Actions Header
                      const Text(
                        'Quick Actions',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Quick Actions Circular Grid
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildQuickActionButton(
                            icon: Icons.directions_car_outlined,
                            label: 'Ride Requests',
                            bgColor: const Color(0xFFEFF6FF),
                            iconColor: const Color(0xFF2563EB),
                            onTap: () {},
                          ),
                          _buildQuickActionButton(
                            icon: Icons.account_balance_wallet_outlined,
                            label: 'Earnings',
                            bgColor: const Color(0xFFF0FDF4),
                            iconColor: const Color(0xFF16A34A),
                            onTap: () {
                              context.go('/wallet');
                            },
                          ),
                          _buildQuickActionButton(
                            icon: Icons.map_outlined,
                            label: 'My Trips',
                            bgColor: const Color(0xFFEFF6FF),
                            iconColor: const Color(0xFF2563EB),
                            onTap: () {
                              context.go('/ride-history');
                            },
                          ),
                          _buildQuickActionButton(
                            icon: Icons.account_balance_wallet_rounded,
                            label: 'Wallet',
                            bgColor: const Color(0xFFEFF6FF),
                            iconColor: const Color(0xFF2563EB),
                            onTap: () {
                              context.go('/wallet');
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ));
          },
        );
      },
    );
  },
);
}

  Widget _buildSummaryStatItem({required String title, required String label}) {
    return Column(
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF64748B),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required Color bgColor,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: bgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 26),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Color(0xFF334155),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawer(
    BuildContext context, {
    required String driverName,
    required String driverRating,
    String? profilePhoto,
    String? subTitleText,
  }) {
    return BlocBuilder<DriverStatusBloc, DriverStatusState>(
      bloc: _driverStatusBloc,
      builder: (context, state) {
        final isOnline = state is DriverStatusOnline;

        return Drawer(
          backgroundColor: Colors.white,
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(top: 60, left: 24, right: 24, bottom: 24),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF0052CC), Color(0xFF1E40AF)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Stack(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                            border: Border.all(color: Colors.white, width: 2),
                            image: (profilePhoto != null && profilePhoto.isNotEmpty)
                                ? DecorationImage(
                                    image: NetworkImage(profilePhoto),
                                    fit: BoxFit.cover,
                                  )
                                : null,
                          ),
                          child: (profilePhoto == null || profilePhoto.isEmpty)
                              ? Center(
                                  child: Text(
                                    driverName.isNotEmpty ? driverName[0].toUpperCase() : 'D',
                                    style: const TextStyle(
                                      fontSize: 26,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF0052CC),
                                    ),
                                  ),
                                )
                              : null,
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            width: 16,
                            height: 16,
                            decoration: BoxDecoration(
                              color: isOnline ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      driverName,
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    if (subTitleText != null && subTitleText.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        subTitleText,
                        style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          '$driverRating Rating',
                          style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 13, fontWeight: FontWeight.w500),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          width: 4,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.5),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          isOnline ? 'Online' : 'Offline',
                          style: TextStyle(
                            color: isOnline ? const Color(0xFFA7F3D0) : const Color(0xFFFCA5A5),
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                  children: [
                    _buildDrawerItem(
                      icon: Icons.dashboard_rounded,
                      title: 'Dashboard',
                      iconColor: const Color(0xFF0052CC),
                      onTap: () {
                        Navigator.pop(context);
                        context.go('/dashboard');
                      },
                    ),
                    _buildDrawerItem(
                      icon: Icons.history_rounded,
                      title: 'Ride History',
                      iconColor: const Color(0xFF2563EB),
                      onTap: () {
                        Navigator.pop(context);
                        context.go('/ride-history');
                      },
                    ),
                    _buildDrawerItem(
                      icon: Icons.account_balance_wallet_rounded,
                      title: 'Wallet & Earnings',
                      iconColor: const Color(0xFF16A34A),
                      onTap: () {
                        Navigator.pop(context);
                        context.go('/wallet');
                      },
                    ),
                    _buildDrawerItem(
                      icon: Icons.person_rounded,
                      title: 'Profile Settings',
                      iconColor: const Color(0xFF2563EB),
                      onTap: () {
                        Navigator.pop(context);
                        context.go('/profile');
                      },
                    ),
                    _buildDrawerItem(
                      icon: Icons.settings_rounded,
                      title: 'Settings',
                      iconColor: Colors.teal,
                      onTap: () {
                        Navigator.pop(context);
                        context.push('/settings');
                      },
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8.0),
                      child: Divider(height: 1),
                    ),
                    _buildDrawerItem(
                      icon: Icons.logout_rounded,
                      title: 'Log Out',
                      iconColor: AppColors.error,
                      showTrailing: false,
                      onTap: () {
                        Navigator.pop(context);
                        widget.onLogout();
                      },
                    ),
                  ],
                ),
              ),

              Padding(
                padding: const EdgeInsets.only(bottom: 24.0),
                child: Text(
                  'v1.0.2 • Partner App',
                  style: TextStyle(
                    color: const Color(0xFF64748B).withOpacity(0.7),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    required Color iconColor,
    required VoidCallback onTap,
    bool showTrailing = true,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        dense: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF0F172A),
          ),
        ),
        trailing: showTrailing
            ? const Icon(
                Icons.chevron_right_rounded,
                color: Color(0xFF94A3B8),
                size: 20,
              )
            : null,
      ),
    );
  }
}

