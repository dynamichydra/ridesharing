import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../style/appcolors.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../injection_container.dart' as di;
import '../../../../features/dashboard/presentation/bloc/driver_status_bloc.dart';
import '../../../../features/ride/presentation/bloc/ride_bloc.dart';
import '../../../../features/ride/presentation/widgets/ride_offer_overlay.dart';
import '../../../../features/ride/presentation/screens/active_ride_screen.dart';
import '../../../../features/ride/domain/entities/active_ride.dart';
import '../../../../features/auth/presentation/bloc/auth_bloc.dart';

class DriverDashboard extends StatefulWidget {
  final VoidCallback onLogout;
  const DriverDashboard({super.key, required this.onLogout});

  @override
  State<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends State<DriverDashboard> {
  late final DriverStatusBloc _driverStatusBloc = di.sl<DriverStatusBloc>();
  late final RideBloc _rideBloc = di.sl<RideBloc>();
  double _todayEarnings = 1850.50;
  int _todayTrips = 8;
  final double _onlineHours = 6.5;

  @override
  void dispose() {
    _driverStatusBloc.close();
    _rideBloc.close();
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
          drawer: _buildDrawer(context),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Gradient Greeting Card with Integrated Status Switcher
                  Container(
                    padding: const EdgeInsets.all(20),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.secondary, AppColors.primary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.secondary.withOpacity(0.15),
                          blurRadius: 12,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isOnline ? 'You are Online' : 'You are Offline',
                                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                isOnline ? 'Ready to accept ride requests nearby' : 'Go online to start receiving rides',
                                style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          onPressed: isTransitioning
                              ? null
                              : () {
                                  if (isOnline) {
                                    _driverStatusBloc.add(GoOfflineRequested());
                                  } else {
                                    _driverStatusBloc.add(GoOnlineRequested());
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: isOnline ? AppColors.error : AppColors.secondary,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                            elevation: 2,
                          ),
                          child: isTransitioning
                              ? const SizedBox(
                                  height: 16,
                                  width: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : Text(
                                  isOnline ? 'Go Offline' : 'Go Online',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                        ),
                      ],
                    ),
                  ),

                  // Warning banner if offline
                  if (!isOnline)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.warning.withOpacity(0.08),
                        border: Border.all(color: AppColors.warning.withOpacity(0.4)),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.warning_amber_rounded, color: AppColors.warning),
                          SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'You are currently offline. Change your status above to receive ride requests!',
                              style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),

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

                  // Radar Availability Indicator Box
                  const Text(
                    'Live Location Radar',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 250,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A), // Premium Dark Slate background for Radar
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isOnline ? AppColors.primary.withOpacity(0.4) : AppColors.border,
                        width: isOnline ? 1.5 : 1.0,
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Concentric radar rings
                          ...List.generate(3, (index) {
                            final size = (index + 1) * 75.0;
                            return Container(
                              width: size,
                              height: size,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: (isOnline ? AppColors.primary : AppColors.textSecondary).withOpacity(0.08),
                                  width: 1.5,
                                ),
                              ),
                            );
                          }),
                          
                          // Radar grid crosshairs
                          Container(width: 200, height: 1, color: Colors.white.withOpacity(0.06)),
                          Container(width: 1, height: 200, color: Colors.white.withOpacity(0.06)),

                          // Glowing Passenger Dots (Simulated near requests)
                          if (isOnline) ...[
                            Positioned(top: 50, left: 70, child: _buildGlowingDot(AppColors.primary)),
                            Positioned(bottom: 70, right: 60, child: _buildGlowingDot(AppColors.secondary)),
                            Positioned(top: 130, right: 90, child: _buildGlowingDot(Colors.cyan)),
                          ],

                          // Scanning sweep layer
                          if (isOnline)
                            Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: SweepGradient(
                                  colors: [
                                    Colors.transparent,
                                    AppColors.primary.withOpacity(0.01),
                                    AppColors.primary.withOpacity(0.04),
                                    AppColors.primary.withOpacity(0.15),
                                    Colors.transparent,
                                  ],
                                  stops: const [0.0, 0.4, 0.6, 0.9, 1.0],
                                ),
                              ),
                            ),

                          // Center Node
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: (isOnline ? AppColors.secondary : Colors.grey[800]!).withOpacity(0.2),
                              border: Border.all(color: isOnline ? AppColors.secondary : Colors.grey, width: 1.5),
                            ),
                            child: Icon(
                              Icons.radar_rounded,
                              size: 28,
                              color: isOnline ? AppColors.primary : Colors.grey,
                            ),
                          ),

                          Positioned(
                            bottom: 16,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.4),
                                borderRadius: BorderRadius.circular(30),
                              ),
                              child: Text(
                                isOnline ? 'SCANNING FOR PASSENGERS...' : 'RADAR OFFLINE',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isOnline ? AppColors.primary : Colors.grey,
                                  letterSpacing: 0.8,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
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
  }

  Widget _buildGlowingDot(Color color) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withOpacity(0.3),
          ),
        ),
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color,
          ),
        ),
      ],
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
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: valueColor),
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
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Weekly Performance',
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

  Widget _buildDrawer(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    final driverName = authState is Authenticated ? (authState.driver.name ?? 'Partner Driver') : 'Partner Driver';
    final driverPhone = authState is Authenticated ? (authState.driver.phone ?? '') : '';
    final driverPhoto = authState is Authenticated ? authState.driver.profilePhoto : null;

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.secondary, AppColors.primary],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: CircleAvatar(
                    radius: 30,
                    backgroundColor: Colors.white,
                    backgroundImage: driverPhoto != null && driverPhoto.isNotEmpty
                        ? NetworkImage(driverPhoto)
                        : null,
                    child: driverPhoto == null || driverPhoto.isEmpty
                        ? const Icon(Icons.person, color: AppColors.secondary, size: 30)
                        : null,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  driverName,
                  style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Text(driverPhone.isNotEmpty ? driverPhone : 'Partner Driver', style: const TextStyle(color: Colors.white70, fontSize: 13)),
              ],
            ),
          ),
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.secondary.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.dashboard_rounded, color: AppColors.secondary, size: 20),
            ),
            title: const Text('Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
            onTap: () => Navigator.pop(context),
          ),
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.history_rounded, color: AppColors.primary, size: 20),
            ),
            title: const Text('Ride History', style: TextStyle(fontWeight: FontWeight.bold)),
            onTap: () => Navigator.pop(context),
          ),
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.secondary.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.wallet_rounded, color: AppColors.secondary, size: 20),
            ),
            title: const Text('Earnings & Wallet', style: TextStyle(fontWeight: FontWeight.bold)),
            onTap: () => Navigator.pop(context),
          ),
          const Divider(),
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.logout_rounded, color: AppColors.error, size: 20),
            ),
            title: const Text('Log Out', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.error)),
            onTap: () {
              Navigator.pop(context);
              widget.onLogout();
            },
          )
        ],
      ),
    );
  }
}
