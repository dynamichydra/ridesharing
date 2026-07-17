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
          backgroundColor: Colors.white,
          appBar: AppBar(
            title: const Text('Driver Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
            backgroundColor: Colors.white,
            foregroundColor: AppColors.textPrimary,
            actions: [
              Row(
                children: [
                  Text(
                    isOnline ? 'ONLINE' : 'OFFLINE',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isOnline ? AppColors.primary : AppColors.error,
                    ),
                  ),
                  if (isTransitioning) ...[
                    const SizedBox(width: 8),
                    const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ],
                  Switch(
                    value: isOnline,
                    activeColor: AppColors.primary,
                    onChanged: isTransitioning
                        ? null
                        : (val) {
                            if (val) {
                              _driverStatusBloc.add(GoOnlineRequested());
                            } else {
                              _driverStatusBloc.add(GoOfflineRequested());
                            }
                          },
                  ),
                ],
              ),
              const SizedBox(width: 8),
            ],
          ),
          drawer: _buildDrawer(context),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Warning banner if offline
                  if (!isOnline)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.warning.withOpacity(0.1),
                        border: Border.all(color: AppColors.warning),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.warning_amber_rounded, color: AppColors.warning),
                          SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'You are offline. Go online to start receiving ride requests!',
                              style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
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
                    childAspectRatio: 1.4,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _buildStatCard('Earnings Today', '₹$_todayEarnings', Icons.payments_rounded, AppColors.primary),
                      _buildStatCard('Trips Done', '$_todayTrips', Icons.directions_car_rounded, AppColors.secondary),
                      _buildStatCard('Online Hours', '${_onlineHours}h', Icons.access_time_rounded, Colors.orange),
                      _buildStatCard('Avg Rating', '4.88 ★', Icons.star_rounded, AppColors.accent),
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
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Icon(Icons.radar_rounded, size: 100, color: AppColors.primary.withOpacity(0.1)),
                        Positioned(
                          child: Text(
                            isOnline ? 'Scanning for passengers...' : 'Radar Offline',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                          ),
                        ),
                      ],
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

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
              Icon(icon, color: color, size: 22),
            ],
          ),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        ],
      ),
    );
  }

  Widget _buildWeeklyPerformanceChart() {
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final amounts = [1200.0, 1500.0, 1850.50, 0.0, 0.0, 0.0, 0.0];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Weekly Performance Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary)),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: List.generate(days.length, (index) {
              final double amount = amounts[index];
              final double percent = amount / 1850.50;
              final double barHeight = percent * 80;

              return Column(
                children: [
                  Text(amount > 0 ? '₹${amount.toInt()}' : '', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
                  const SizedBox(height: 4),
                  Container(
                    width: 14,
                    height: barHeight > 5 ? barHeight : 5,
                    decoration: BoxDecoration(
                      color: amount > 0 ? AppColors.primary : AppColors.border,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(days[index], style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          const DrawerHeader(
            decoration: BoxDecoration(color: AppColors.primary),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CircleAvatar(backgroundColor: Colors.white, child: Icon(Icons.person, color: AppColors.primary)),
                SizedBox(height: 12),
                Text(
                  'Arijit Bose',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Text('Partner Driver', style: TextStyle(color: Colors.white70, fontSize: 13)),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard_rounded, color: AppColors.primary),
            title: const Text('Dashboard'),
            onTap: () => Navigator.pop(context),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: AppColors.error),
            title: const Text('Log Out', style: TextStyle(color: AppColors.error)),
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
