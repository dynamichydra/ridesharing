import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import '../widgets/navigation_drawer.dart';

class MainLayout extends StatefulWidget {
  final Widget child;
  const MainLayout({super.key, required this.child});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _calculateSelectedIndex(BuildContext context) {
    final String location = GoRouterState.of(context).matchedLocation;
    if (location == '/ride-history') return 1;
    if (location == '/wallet') return 2;
    if (location == '/profile') return 3;
    return 0; // Default to Home
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/home');
        break;
      case 1:
        context.go('/ride-history');
        break;
      case 2:
        context.go('/wallet');
        break;
      case 3:
        context.go('/profile');
        break;
    }
  }

  Widget _buildNavIcon(String assetName, bool isSelected) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 3, top: 3),
      child: SvgPicture.asset(
        'assets/bottom-nav-icons/$assetName',
        width: 18,
        height: 18,
        colorFilter: ColorFilter.mode(
          isSelected ? const Color(0xFF009048) : const Color(0xFF64748B),
          BlendMode.srcIn,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _calculateSelectedIndex(context);

    return Scaffold(
      drawer: const AppNavigationDrawer(),
      body: widget.child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(
            top: BorderSide(color: Color(0xFFF1F5F9), width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: selectedIndex,
          onTap: (index) => _onItemTapped(index, context),
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          elevation: 0,
          selectedItemColor: const Color(0xFF009048),
          unselectedItemColor: const Color(0xFF64748B),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
          items: [
            BottomNavigationBarItem(
              icon: _buildNavIcon('home.svg', selectedIndex == 0),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: _buildNavIcon('my-rides.svg', selectedIndex == 1),
              label: 'My Rides',
            ),
            BottomNavigationBarItem(
              icon: _buildNavIcon('wallet.svg', selectedIndex == 2),
              label: 'Wallet',
            ),
            BottomNavigationBarItem(
              icon: _buildNavIcon('profile.svg', selectedIndex == 3),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
