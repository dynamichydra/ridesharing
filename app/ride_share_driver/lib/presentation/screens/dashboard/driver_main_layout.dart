import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../common/widgets/app_drawer.dart';
import '../../../features/profile/presentation/bloc/profile_bloc.dart';
import '../../../features/ride/presentation/bloc/ride_bloc.dart';
import '../../../injection_container.dart' as di;
import '../../../core/services/app_event_bus.dart';

class DriverMainLayout extends StatefulWidget {
  final StatefulNavigationShell navigationShell;
  const DriverMainLayout({super.key, required this.navigationShell});

  static final GlobalKey<ScaffoldState> scaffoldKey = GlobalKey<ScaffoldState>();
  static void Function(int)? onSwitchTab;

  static void openDrawer() {
    scaffoldKey.currentState?.openDrawer();
  }

  static void switchToTab(int index) {
    onSwitchTab?.call(index);
  }

  @override
  State<DriverMainLayout> createState() => _DriverMainLayoutState();
}

class _DriverMainLayoutState extends State<DriverMainLayout> {
  late final ProfileBloc _profileBloc;
  late final RideBloc _rideBloc;

  @override
  void initState() {
    super.initState();
    DriverMainLayout.onSwitchTab = (index) => _onItemTapped(index);
    _profileBloc = di.sl<ProfileBloc>()..add(LoadProfile());
    _rideBloc = di.sl<RideBloc>();
  }

  @override
  void dispose() {
    DriverMainLayout.onSwitchTab = null;
    super.dispose();
  }

  void _onItemTapped(int index) {
    widget.navigationShell.goBranch(
      index,
      initialLocation: index == widget.navigationShell.currentIndex,
    );
    AppEventBus.notifyTabSwitched(index);
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: _profileBloc),
        BlocProvider.value(value: _rideBloc),
      ],
      child: MultiBlocListener(
        listeners: [
          BlocListener<RideBloc, RideState>(
            bloc: _rideBloc,
            listener: (context, state) {
              if (state is RideOfferPending && state.offers.isNotEmpty) {
                if (widget.navigationShell.currentIndex != 0) {
                  widget.navigationShell.goBranch(0);
                }
              } else if (state is RideCompleted) {
                AppEventBus.notifyRideCompleted(state.ride);
              }
            },
          ),
        ],
        child: Scaffold(
          key: DriverMainLayout.scaffoldKey,
          drawer: const AppDrawer(),
          body: widget.navigationShell,
          bottomNavigationBar: _buildBottomNav(),
        ),
      ),
    );
  }

  Widget _buildBottomNav() {
    final currentIndex = widget.navigationShell.currentIndex;
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: Color(0xFFEEF2F7), width: 1),
        ),
        boxShadow: [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 16,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 60,
          child: Row(
            children: [
              _buildNavItem(index: 0, icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: 'Home', currentIndex: currentIndex),
              _buildNavItem(index: 1, icon: Icons.account_balance_wallet_outlined, activeIcon: Icons.account_balance_wallet_rounded, label: 'Earnings', currentIndex: currentIndex),
              _buildNavItem(index: 2, icon: Icons.mail_outline_rounded, activeIcon: Icons.mail_rounded, label: 'Inbox', currentIndex: currentIndex),
              _buildNavItem(index: 3, icon: Icons.person_outline_rounded, activeIcon: Icons.person_rounded, label: 'Profile', currentIndex: currentIndex),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required IconData activeIcon,
    required String label,
    required int currentIndex,
  }) {
    final isActive = currentIndex == index;
    return Expanded(
      child: InkWell(
        onTap: () => _onItemTapped(index),
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFF009048).withValues(alpha: 0.1) : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                isActive ? activeIcon : icon,
                color: isActive ? const Color(0xFF009048) : const Color(0xFF8A94A6),
                size: 22,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                color: isActive ? const Color(0xFF009048) : const Color(0xFF8A94A6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
