import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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
import '../../../../features/wallet/presentation/pages/wallet_page.dart';
import '../../../../features/ride_history/presentation/pages/ride_history_page.dart';
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
  double _todayEarnings = 1850.50;
  int _todayTrips = 8;
  final double _onlineHours = 6.5;

  @override
  void initState() {
    super.initState();
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
            isBusy: rideState is RideActionInProgress,
            onMarkArriving: () => _rideBloc.add(MarkArrivingRequested()),
            onStart: () => _rideBloc.add(StartRideRequested()),
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
              RideOfferOverlay(
                offer: rideState.offer,
                onAccept: () => _rideBloc.add(AcceptOfferRequested(rideId: rideState.offer.rideId)),
                onDecline: () => _rideBloc.add(DeclineOfferRequested(rideId: rideState.offer.rideId)),
                onExpired: () => _rideBloc.add(OfferExpiredLocally(rideId: rideState.offer.rideId)),
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
                const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 64),
                const SizedBox(height: 16),
                const Text(
                  'Trip Completed',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 8),
                Text(
                  '$currency ${(minor / 100).toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.primary),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => _rideBloc.add(AcknowledgeCompletionRequested()),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
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
    return BlocConsumer<AuthBloc, AuthState>(
      bloc: _authBloc,
      listener: (context, authState) {
        if (authState is Authenticated && authState.driver.isOnline) {
          _rideBloc.add(ConnectRideSocket());
        }
      },
      builder: (context, authState) {
        final String driverName = (authState is Authenticated) ? (authState.driver.name ?? 'Driver') : 'Driver';
        final String driverRating = (authState is Authenticated) ? authState.driver.rating.toStringAsFixed(2) : '5.00';

        return BlocConsumer<DriverStatusBloc, DriverStatusState>(
          bloc: _driverStatusBloc,
          listener: (context, state) {
            if (state is DriverStatusError) {
              CustomToast.show(context, state.message);
            } else if (state is DriverStatusOnline) {
              // Ride offers only arrive over the /driver socket connection — see
              // RideSocketDataSource. Only keep it open while actually online.
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
            title: const Text('Driver Dashboard', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
            backgroundColor: Colors.white,
            foregroundColor: AppColors.textPrimary,
            elevation: 0,
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(1),
              child: Container(
                color: AppColors.border.withOpacity(0.4),
                height: 1,
              ),
            ),
          ),
          drawer: _buildDrawer(context, driverName, driverRating),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Greeting Header
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Welcome back,',
                        style: TextStyle(fontSize: 14, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        driverName,
                        style: const TextStyle(fontSize: 24, color: AppColors.textPrimary, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Integrated Status Switcher Card
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: isOnline ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                      border: Border.all(
                        color: isOnline ? const Color(0xFFA7F3D0) : const Color(0xFFFEE2E2),
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: (isOnline ? const Color(0xFF10B981) : const Color(0xFFEF4444)).withOpacity(0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: isOnline ? const Color(0xFFD1FAE5) : const Color(0xFFFEE2E2),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isOnline ? Icons.wifi_rounded : Icons.wifi_off_rounded,
                            color: isOnline ? const Color(0xFF059669) : const Color(0xFFDC2626),
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isOnline ? 'You are Online' : 'You are Offline',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: isOnline ? const Color(0xFF065F46) : const Color(0xFF991B1B),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                isOnline ? 'Ready to accept passenger requests' : 'Go online to start receiving rides',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isOnline ? const Color(0xFF047857) : const Color(0xFFB91C1C),
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (isTransitioning)
                          const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          )
                        else
                          Switch(
                            value: isOnline,
                            activeColor: const Color(0xFF10B981),
                            activeTrackColor: const Color(0xFFA7F3D0),
                            inactiveThumbColor: const Color(0xFFEF4444),
                            inactiveTrackColor: const Color(0xFFFCA5A5),
                            onChanged: (val) {
                              if (val) {
                                _driverStatusBloc.add(GoOnlineRequested());
                              } else {
                                _driverStatusBloc.add(GoOfflineRequested());
                              }
                            },
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Radar Availability Indicator Box
                  const Text(
                    'Live Location Radar',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 220,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A), // Slate 900
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F172A).withOpacity(0.12),
                          blurRadius: 16,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Concentric circles
                          Container(
                            width: 140,
                            height: 140,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white.withOpacity(0.05), width: 1.5),
                            ),
                          ),
                          Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white.withOpacity(0.08), width: 1.5),
                            ),
                          ),
                          // Glow center node
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: (isOnline ? AppColors.primary : Colors.grey).withOpacity(0.15),
                            ),
                          ),
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isOnline ? AppColors.primary : Colors.grey,
                              boxShadow: [
                                BoxShadow(
                                  color: (isOnline ? AppColors.primary : Colors.grey).withOpacity(0.8),
                                  blurRadius: 8,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                          ),
                          Positioned(
                            bottom: 16,
                            child: Text(
                              isOnline ? 'SCANNING FOR PASSENGERS...' : 'RADAR OFFLINE',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: isOnline ? AppColors.primary.withOpacity(0.9) : Colors.grey.shade500,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Stats Dashboard Grid
                  GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 1.35,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _buildStatCard('Earnings Today', '₹$_todayEarnings', Icons.payments_rounded, AppColors.secondary, AppColors.primary, subtext: '+12% from yesterday'),
                      _buildStatCard('Trips Done', '$_todayTrips', Icons.directions_car_rounded, AppColors.primary, AppColors.secondary, subtext: 'Goal: 10 trips'),
                      _buildStatCard('Online Hours', '${_onlineHours}h', Icons.access_time_rounded, AppColors.secondary, AppColors.primary, subtext: 'Active duty'),
                      _buildStatCard('Avg Rating', '4.88 ★', Icons.star_rounded, AppColors.primary, AppColors.secondary, subtext: 'Excellent score'),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Weekly Performance Summary Chart
                  _buildWeeklyPerformanceChart(),
                ],
              ),
            ),
          ),
        );
      },
    );
      },
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color iconColor, Color valueColor, {String? subtext}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: valueColor),
              ),
              if (subtext != null) ...[
                const SizedBox(height: 2),
                Text(
                  subtext,
                  style: TextStyle(fontSize: 10, color: AppColors.textSecondary.withOpacity(0.8), fontWeight: FontWeight.w500),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildWeeklyPerformanceChart() {
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final amounts = [1200.0, 1500.0, 1850.50, 0.0, 0.0, 0.0, 0.0];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text(
                'Weekly Performance Summary',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
              ),
              Icon(Icons.analytics_rounded, color: AppColors.secondary, size: 20),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: List.generate(days.length, (index) {
              final double amount = amounts[index];
              final double percent = amount / 1850.50;
              final double barHeight = percent * 80;
              final color = index % 2 == 0 ? AppColors.primary : AppColors.secondary;

              return Column(
                children: [
                  Text(
                    amount > 0 ? '₹${amount.toInt()}' : '-',
                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    width: 14,
                    height: barHeight > 5 ? barHeight : 5,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [color.withOpacity(0.7), color],
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                      ),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    days[index],
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                  ),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawer(BuildContext context, String driverName, String driverRating) {
    return BlocBuilder<DriverStatusBloc, DriverStatusState>(
      bloc: _driverStatusBloc,
      builder: (context, state) {
        final isOnline = state is DriverStatusOnline;

        return Drawer(
          backgroundColor: Colors.white,
          child: Column(
            children: [
              // Premium Header
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(top: 60, left: 24, right: 24, bottom: 24),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.secondary, AppColors.primary],
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
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const CircleAvatar(
                            radius: 32,
                            backgroundColor: Colors.white,
                            child: Icon(Icons.person, color: AppColors.secondary, size: 36),
                          ),
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
                    const SizedBox(height: 16),
                    Text(
                      driverName,
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
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

              // Drawer Navigation Items
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                  children: [
                    _buildDrawerItem(
                      icon: Icons.dashboard_rounded,
                      title: 'Dashboard',
                      iconColor: AppColors.secondary,
                      onTap: () => Navigator.pop(context),
                    ),
                    _buildDrawerItem(
                      icon: Icons.history_rounded,
                      title: 'Ride History',
                      iconColor: AppColors.primary,
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const RideHistoryPage()));
                      },
                    ),
                    _buildDrawerItem(
                      icon: Icons.account_balance_wallet_rounded,
                      title: 'Wallet & Earnings',
                      iconColor: AppColors.secondary,
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletPage()));
                      },
                    ),
                    _buildDrawerItem(
                      icon: Icons.person_rounded,
                      title: 'Profile Settings',
                      iconColor: AppColors.primary,
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfilePage()));
                      },
                    ),
                    _buildDrawerItem(
                      icon: Icons.settings_rounded,
                      title: 'Settings',
                      iconColor: Colors.teal,
                      onTap: () {
                        Navigator.pop(context);
                        // Pass driver from authBloc
                        final authState = _authBloc.state;
                        final driver = authState is Authenticated ? authState.driver : null;
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => SettingsPage(driver: driver, onLogout: widget.onLogout)),
                        );
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
              
              // Footer version / info
              Padding(
                padding: const EdgeInsets.only(bottom: 24.0),
                child: Text(
                  'v1.0.2 • Partner App',
                  style: TextStyle(
                    color: AppColors.textSecondary.withOpacity(0.5),
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
            color: AppColors.textPrimary,
          ),
        ),
        trailing: showTrailing
            ? Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textSecondary.withOpacity(0.4),
                size: 20,
              )
            : null,
      ),
    );
  }
}
