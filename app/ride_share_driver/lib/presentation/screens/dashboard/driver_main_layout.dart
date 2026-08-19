import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class DriverMainLayout extends StatefulWidget {
  final Widget child;
  const DriverMainLayout({super.key, required this.child});

  @override
  State<DriverMainLayout> createState() => _DriverMainLayoutState();
}

class _DriverMainLayoutState extends State<DriverMainLayout> {
  int _calculateSelectedIndex(BuildContext context) {
    final String location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/ride-history')) return 1;
    if (location.startsWith('/earnings')) return 2;
    if (location.startsWith('/wallet')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0; // Default to Dashboard (/dashboard)
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/dashboard');
        break;
      case 1:
        context.go('/ride-history');
        break;
      case 2:
        context.go('/earnings');
        break;
      case 3:
        context.go('/wallet');
        break;
      case 4:
        context.go('/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _calculateSelectedIndex(context);

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(
            top: BorderSide(color: Color(0xFFF1F5F9), width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
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
          unselectedItemColor: const Color(0xFF8A94A6),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_rounded, size: 22),
              activeIcon: Icon(Icons.home_rounded, size: 22),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.assignment_outlined, size: 22),
              activeIcon: Icon(Icons.assignment_rounded, size: 22),
              label: 'Rides',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.monetization_on_outlined, size: 22),
              activeIcon: Icon(Icons.monetization_on_rounded, size: 22),
              label: 'Earnings',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.account_balance_wallet_outlined, size: 22),
              activeIcon: Icon(Icons.account_balance_wallet_rounded, size: 22),
              label: 'Wallet',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded, size: 22),
              activeIcon: Icon(Icons.person_rounded, size: 22),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
