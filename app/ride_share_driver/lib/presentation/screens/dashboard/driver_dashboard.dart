import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../injection_container.dart' as di;
import '../../../../features/dashboard/presentation/bloc/driver_status_bloc.dart';
import '../../../../features/ride/presentation/bloc/ride_bloc.dart';
import '../../../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../../../features/ride/domain/entities/active_ride.dart';
import '../../../../features/ride/domain/entities/ride_offer.dart';
import '../../../../features/profile/presentation/bloc/profile_bloc.dart';
import '../../../../features/wallet/presentation/bloc/wallet_bloc.dart';
import '../../../../features/ride_history/presentation/bloc/ride_history_bloc.dart';
import '../../../../features/ride/presentation/widgets/ride_request_card.dart';
import '../../../../common/entities/driver_dashboard_summary.dart';
import '../../../../common/entities/driver_profile.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../../../features/subscription/domain/repositories/subscription_repository.dart';
import '../../../../features/subscription/domain/entities/active_subscription.dart';
import 'widgets/pulsing_radar_view.dart';
import 'widgets/offline_mode_view.dart';
import 'driver_main_layout.dart';

class DriverDashboard extends StatefulWidget {
  final VoidCallback onLogout;
  const DriverDashboard({super.key, required this.onLogout});

  @override
  State<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends State<DriverDashboard>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late final DriverStatusBloc _driverStatusBloc = di.sl<DriverStatusBloc>();
  late final RideBloc _rideBloc = di.sl<RideBloc>();
  late final AuthBloc _authBloc = di.sl<AuthBloc>();
  late final ProfileBloc _profileBloc = di.sl<ProfileBloc>();
  late final WalletBloc _walletBloc = di.sl<WalletBloc>();
  late final RideHistoryBloc _rideHistoryBloc = di.sl<RideHistoryBloc>();

  late final AnimationController _moneyAnimController;
  late final Animation<Offset> _moneySlideAnim;
  late final Animation<double> _moneyFadeAnim;
  late final Animation<double> _moneyScaleAnim;
  double? _lastAddedAmount;
  bool _showMoneyBadge = false;
  bool _hasCheckedExpiredOnLaunch = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _moneyAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );

    _moneySlideAnim = Tween<Offset>(
      begin: const Offset(0, 0.5),
      end: const Offset(0, -0.6),
    ).animate(CurvedAnimation(
      parent: _moneyAnimController,
      curve: Curves.easeOutCubic,
    ));

    _moneyFadeAnim = TweenSequence<double>([
      TweenSequenceItem(tween: Tween<double>(begin: 0.0, end: 1.0), weight: 20),
      TweenSequenceItem(tween: Tween<double>(begin: 1.0, end: 1.0), weight: 50),
      TweenSequenceItem(tween: Tween<double>(begin: 1.0, end: 0.0), weight: 30),
    ]).animate(_moneyAnimController);

    _moneyScaleAnim = TweenSequence<double>([
      TweenSequenceItem(tween: Tween<double>(begin: 0.5, end: 1.15), weight: 25),
      TweenSequenceItem(tween: Tween<double>(begin: 1.15, end: 1.0), weight: 20),
      TweenSequenceItem(tween: Tween<double>(begin: 1.0, end: 1.0), weight: 55),
    ]).animate(_moneyAnimController);

    _profileBloc.add(LoadProfile());
    _walletBloc.add(LoadWalletData());
    _rideHistoryBloc.add(LoadRideHistory());

    // Always start in offline state on app open or fresh login
    _initOfflineStatus();
  }

  void _initOfflineStatus() {
    _driverStatusBloc.add(RestoreOnlineStatus(isOnline: false));
    di.sl<SecureStorage>().saveOnlineStatus(false);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.detached || state == AppLifecycleState.hidden) {
      // Driver closed the app or navigated away: automatically go offline
      _driverStatusBloc.add(GoOfflineRequested());
      _rideBloc.add(DisconnectRideSocket());
      di.sl<SecureStorage>().saveOnlineStatus(false);
    }
  }

  void _showMoneyAddedAnimation(double amount) {
    if (amount <= 0) return;
    Future.delayed(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      setState(() {
        _lastAddedAmount = amount;
        _showMoneyBadge = true;
      });
      _moneyAnimController.forward(from: 0.0).then((_) {
        Future.delayed(const Duration(milliseconds: 2500), () {
          if (mounted) {
            setState(() {
              _showMoneyBadge = false;
            });
          }
        });
      });
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _moneyAnimController.dispose();
    super.dispose();
  }

  Future<void> _showSubscriptionRequiredDialog(BuildContext context, String message) async {
    ActiveSubscription? activeSub;
    try {
      activeSub = await di.sl<SubscriptionRepository>().getMySubscription();
    } catch (_) {}

    if (!context.mounted) return;

    final isExpired = activeSub != null && (activeSub.isExpired || activeSub.status.toLowerCase() == 'expired');

    // If subscription is not expired (e.g. no plan or inactive), route directly to subscription screen
    if (!isExpired) {
      context.push('/subscription');
      return;
    }

    String dateLabel = '';
    if (activeSub.endDate != null) {
      final dt = DateTime.tryParse(activeSub.endDate!);
      if (dt != null) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        final formattedDate = '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
        dateLabel = 'Expired on $formattedDate';
      } else {
        dateLabel = 'Expired';
      }
    } else {
      dateLabel = 'Expired';
    }

    const title = 'Your subscription\nhas expired';
    const subtitle = 'Your driver subscription has ended.\nRenew your subscription to go Live and\nstart accepting rides.';
    const badgeText = 'EXPIRED';
    const statusText = 'Expired';
    const buttonText = 'Renew Subscription';

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogCtx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        backgroundColor: Colors.white,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top close button (X)
              Align(
                alignment: Alignment.topRight,
                child: IconButton(
                  visualDensity: VisualDensity.compact,
                  splashRadius: 20,
                  icon: const Icon(Icons.close_rounded, size: 22, color: Color(0xFF64748B)),
                  onPressed: () => Navigator.pop(dialogCtx),
                ),
              ),

              // Calendar + Lock Badge Illustration with Sparkles
              SizedBox(
                height: 120,
                width: 140,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Background soft circular glow
                    Container(
                      width: 90,
                      height: 90,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFEF3C7),
                        shape: BoxShape.circle,
                      ),
                    ),

                    // Left Sparkle (Green + blue)
                    Positioned(
                      left: 4,
                      top: 24,
                      child: Icon(Icons.star_rounded, size: 14, color: const Color(0xFF10B981).withValues(alpha: 0.8)),
                    ),
                    Positioned(
                      left: 12,
                      bottom: 30,
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFF3B82F6), width: 1.5),
                        ),
                      ),
                    ),

                    // Right Sparkle (Yellow + Green)
                    Positioned(
                      right: 6,
                      top: 36,
                      child: Icon(Icons.star_rounded, size: 14, color: const Color(0xFFF59E0B).withValues(alpha: 0.8)),
                    ),

                    // Main Calendar Card
                    Container(
                      width: 72,
                      height: 74,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          // Green Top Header with rings
                          Container(
                            height: 22,
                            decoration: const BoxDecoration(
                              color: Color(0xFF009048),
                              borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                Container(
                                  width: 4,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                                Container(
                                  width: 4,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Calendar Grid dots
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                              child: GridView.count(
                                crossAxisCount: 4,
                                mainAxisSpacing: 3,
                                crossAxisSpacing: 3,
                                physics: const NeverScrollableScrollPhysics(),
                                children: List.generate(
                                  12,
                                  (index) => Container(
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE2E8F0),
                                      borderRadius: BorderRadius.circular(2),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Yellow Lock Badge overlaid on bottom-right of calendar
                    Positioned(
                      right: 18,
                      bottom: 10,
                      child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFACC15), Color(0xFFEAB308)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFEAB308).withValues(alpha: 0.4),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.lock_rounded,
                          color: Color(0xFF1E293B),
                          size: 20,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Title
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  height: 1.2,
                ),
              ),

              const SizedBox(height: 10),

              // Subtitle
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF64748B),
                  height: 1.4,
                ),
              ),

              const SizedBox(height: 20),

              // Subscription Status Info Box
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                ),
                child: Row(
                  children: [
                    // Icon with soft green circular bg
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.assignment_turned_in_outlined,
                          color: Color(0xFF009048),
                          size: 24,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Details text
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Subscription',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 1),
                          Text(
                            statusText,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFFEF4444),
                            ),
                          ),
                          const SizedBox(height: 1),
                          Text(
                            dateLabel,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Status Badge (EXPIRED)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        badgeText,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFFDC2626),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Green Primary Action Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF009048),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  onPressed: () {
                    Navigator.pop(dialogCtx);
                    context.push('/subscription');
                  },
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.workspace_premium_rounded,
                          color: Color(0xFF009048),
                          size: 16,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        buttonText,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Icon(Icons.chevron_right_rounded, size: 20),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Not Now Text Button
              GestureDetector(
                onTap: () => Navigator.pop(dialogCtx),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 4),
                  child: Text(
                    'Not Now',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
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
              if (state.message.toLowerCase().contains('subscription')) {
                _showSubscriptionRequiredDialog(context, state.message);
              } else {
                CustomToast.show(context, state.message);
              }
            } else if (state is DriverStatusOnline) {
              _rideBloc.add(ConnectRideSocket());
            } else if (state is DriverStatusOffline) {
              _rideBloc.add(DisconnectRideSocket());
            }
          },
        ),
        BlocListener<RideBloc, RideState>(
          bloc: _rideBloc,
          listenWhen: (previous, current) {
            // Only trigger auto-navigation on a fresh acceptance transition
            if (previous is RideAccepting && current is RideActive) {
              return true;
            }
            return current is RideOfferGone ||
                current is RideOperationFailed ||
                current is RideCancelledByRider ||
                current is RideCompleted;
          },
          listener: (context, state) {
            if (state is RideActive) {
              context.push('/active-ride');
            } else if (state is RideOfferGone) {
              // Card simply slides away without showing an intrusive popup toast
            } else if (state is RideOperationFailed) {
              CustomToast.show(context, state.message);
            } else if (state is RideCancelledByRider) {
              CustomToast.show(context, state.message);
            } else if (state is RideCompleted) {
              _profileBloc.add(LoadProfile());
              _walletBloc.add(LoadWalletData());
              final fareMinor = state.ride.finalFareMinor ?? state.ride.estimatedFareMinor ?? 0;
              final fareNum = fareMinor / 100.0;
              final fare = fareNum.toStringAsFixed(2);
              _showMoneyAddedAnimation(fareNum);
              final isWallet = state.ride.paymentMethod?.toLowerCase() == 'wallet';
              if (isWallet) {
                CustomToast.show(context, 'Ride Completed! ₹$fare credited to your Ryva Wallet');
              } else {
                CustomToast.show(context, 'Ride Completed! Collect ₹$fare cash from rider');
              }
            }
          },
        ),
        BlocListener<ProfileBloc, ProfileState>(
          bloc: _profileBloc,
          listener: (context, state) {
            // Profile data is loaded into dashboard state
          },
        ),
      ],
      child: BlocBuilder<AuthBloc, AuthState>(
        bloc: _authBloc,
        builder: (context, authState) {
          return BlocBuilder<ProfileBloc, ProfileState>(
            bloc: _profileBloc,
            builder: (context, profileState) {
              // Extract summary and profile from all states that carry them,
              // so the dashboard doesn't flash zeros during refresh/update.
              final DriverDashboardSummary? summary;
              final DriverProfile? profile;
              if (profileState is ProfileLoaded) {
                summary = profileState.summary;
                profile = profileState.profile;
              } else if (profileState is ProfileUpdateSuccess) {
                summary = profileState.summary;
                profile = profileState.profile;
              } else if (profileState is ProfileUpdating) {
                summary = profileState.summary;
                profile = profileState.profile;
              } else if (profileState is ProfileLoading) {
                summary = profileState.previousSummary;
                profile = profileState.previousProfile;
              } else {
                summary = null;
                profile = null;
              }

              final driverName =
                  summary?.name ??
                  profile?.name ??
                  ((authState is Authenticated)
                      ? (authState.driver.name ?? 'Driver')
                      : 'Driver');
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
                  final isGoingOnline =
                      statusState is DriverStatusTransitioning &&
                      statusState.goingOnline;
                  final isGoingOffline =
                      statusState is DriverStatusTransitioning &&
                      !statusState.goingOnline;
                  final isTransitioning =
                      statusState is DriverStatusTransitioning;

                  return BlocBuilder<RideBloc, RideState>(
                    bloc: _rideBloc,
                    builder: (context, rideState) {
                      ActiveRide? activeRide;

                      if (rideState is RideActive) {
                        activeRide = rideState.ride;
                      } else if (rideState is RideActionInProgress) {
                        activeRide = rideState.ride;
                      }

                      List<RideOffer> pendingOffers = [];
                      bool isAccepting = false;
                      if (rideState is RideOfferPending) {
                        pendingOffers = rideState.offers;
                      } else if (rideState is RideAccepting && rideState.offer != null) {
                        pendingOffers = [rideState.offer!];
                        isAccepting = true;
                      }

                      return Scaffold(
                        backgroundColor: Colors.white,
                        appBar: AppBar(
                          backgroundColor: Colors.white,
                          elevation: 0,
                          scrolledUnderElevation: 0,
                          leading: IconButton(
                            icon: const Icon(
                              Icons.menu_rounded,
                              color: Color(0xFF021B47),
                              size: 26,
                            ),
                            onPressed: () => DriverMainLayout.openDrawer(),
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
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(height: 12),

                                    // 1. Top Header Profile / Status Card
                                    _buildHeaderSection(
                                      context: context,
                                      driverName: driverName,
                                      driverRating: driverRating,
                                      profilePhoto: profilePhoto,
                                      isOnline: isOnline,
                                      isTransitioning: isTransitioning,
                                      isGoingOnline: isGoingOnline,
                                      isGoingOffline: isGoingOffline,
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
                                          isGoingOnline: isGoingOnline,
                                          onGoOnline: isTransitioning
                                              ? () {}
                                              : () => _toggleOnlineStatus(false),
                                        ),
                                      )
                                    else if (activeRide != null)
                                      // ONGOING ACTIVE TRIP — do not display new ride requests
                                      const SizedBox.shrink()
                                    else if (pendingOffers.isNotEmpty)
                                      // ONLINE - OFFERS AVAILABLE
                                      _buildOffersAvailableSection(
                                        pendingOffers,
                                        isAccepting,
                                      )
                                    else
                                      // SEARCHING FOR OFFERS
                                      _buildSearchingForOffersSection(),

                                    // Active Trip Banner if ongoing trip and driver navigated back to dashboard
                                    if (activeRide != null)
                                      GestureDetector(
                                        onTap: () => context.push('/active-ride'),
                                        child: Container(
                                          margin: const EdgeInsets.only(bottom: 16),
                                          padding: const EdgeInsets.all(16),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF009048),
                                            borderRadius: BorderRadius.circular(16),
                                            boxShadow: [
                                              BoxShadow(
                                                color: const Color(0xFF009048).withValues(alpha: 0.3),
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
                                                  color: Colors.white.withValues(alpha: 0.2),
                                                  shape: BoxShape.circle,
                                                ),
                                                child: const Icon(Icons.navigation_rounded, color: Colors.white, size: 22),
                                              ),
                                              const SizedBox(width: 12),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      activeRide.status == 'started'
                                                          ? 'Trip in Progress'
                                                          : (activeRide.status == 'arriving' ? 'Waiting at Pickup' : 'Heading to Pickup'),
                                                      style: const TextStyle(
                                                        color: Colors.white,
                                                        fontWeight: FontWeight.bold,
                                                        fontSize: 15,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 2),
                                                    Text(
                                                      activeRide.dropAddress ?? 'Tap to view live navigation',
                                                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 16),
                                            ],
                                          ),
                                        ),
                                      ),

                                    const SizedBox(height: 24),
                                  ],
                                ),
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
    bool isTransitioning = false,
    bool isGoingOnline = false,
    bool isGoingOffline = false,
  }) {
    final initials = _getInitials(driverName);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Driver Avatar & Name + Rating
        GestureDetector(
          onTap: () => DriverMainLayout.openDrawer(),
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
                        color: (isOnline || isGoingOnline)
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

        // Online / Offline Pill Switch with smooth sliding and loading animation
        GestureDetector(
          onTap: isTransitioning ? null : () => _toggleOnlineStatus(isOnline),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 280),
            curve: Curves.easeInOut,
            width: 96,
            height: 36,
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: isOnline
                  ? const Color(0xFF009048)
                  : (isGoingOnline
                      ? const Color(0xFF009048).withValues(alpha: 0.8)
                      : const Color(0xFF64748B)),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Stack(
              children: [
                AnimatedAlign(
                  duration: const Duration(milliseconds: 280),
                  curve: Curves.easeInOut,
                  alignment: (isOnline || isGoingOnline)
                      ? Alignment.centerLeft
                      : Alignment.centerRight,
                  child: Padding(
                    padding: EdgeInsets.only(
                      left: (isOnline || isGoingOnline) ? 8 : 0,
                      right: (isOnline || isGoingOnline) ? 0 : 8,
                    ),
                    child: Text(
                      isGoingOnline
                          ? 'Going...'
                          : (isGoingOffline
                              ? 'Going...'
                              : (isOnline ? 'Online' : 'Offline')),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                AnimatedAlign(
                  duration: const Duration(milliseconds: 280),
                  curve: Curves.easeInOut,
                  alignment: (isOnline || isGoingOnline)
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
                    child: isTransitioning
                        ? const Center(
                            child: SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.0,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Color(0xFF009048),
                                ),
                              ),
                            ),
                          )
                        : null,
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
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Row(
                    children: [
                      // Animated pulse ring around icon container
                      AnimatedBuilder(
                        animation: _moneyAnimController,
                        builder: (context, child) {
                          final isAnimating = _moneyAnimController.isAnimating;
                          return Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isAnimating ? const Color(0xFFDCFCE7) : const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(10),
                              border: isAnimating
                                  ? Border.all(color: const Color(0xFF009048).withValues(alpha: 0.6), width: 1.5)
                                  : null,
                              boxShadow: isAnimating
                                  ? [
                                      BoxShadow(
                                        color: const Color(0xFF009048).withValues(alpha: 0.3),
                                        blurRadius: 10,
                                        spreadRadius: 2,
                                      )
                                    ]
                                  : null,
                            ),
                            child: child,
                          );
                        },
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
                            AnimatedBuilder(
                              animation: _moneyAnimController,
                              builder: (context, child) {
                                final scale = _moneyAnimController.isAnimating
                                    ? 1.0 + (0.12 * (1.0 - (_moneyAnimController.value - 0.5).abs() * 2).clamp(0.0, 1.0))
                                    : 1.0;
                                return Transform.scale(
                                  scale: scale,
                                  alignment: Alignment.centerLeft,
                                  child: Text(
                                    '₹$earningsStr',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w900,
                                      color: _moneyAnimController.isAnimating
                                          ? const Color(0xFF009048)
                                          : const Color(0xFF0F172A),
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Floating animated "+₹XX" Badge
                  if (_showMoneyBadge && _lastAddedAmount != null)
                    Positioned(
                      top: -24,
                      left: 10,
                      child: SlideTransition(
                        position: _moneySlideAnim,
                        child: FadeTransition(
                          opacity: _moneyFadeAnim,
                          child: ScaleTransition(
                            scale: _moneyScaleAnim,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFF009048),
                                borderRadius: BorderRadius.circular(12),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF009048).withValues(alpha: 0.4),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.arrow_upward_rounded, color: Colors.white, size: 11),
                                  const SizedBox(width: 2),
                                  Text(
                                    '+₹${_lastAddedAmount!.toStringAsFixed(0)}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
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
                          'Duration',
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
  Widget _buildOffersAvailableSection(List<RideOffer> offers, bool isAccepting) {
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
            isAccepting: isAccepting,
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
}
