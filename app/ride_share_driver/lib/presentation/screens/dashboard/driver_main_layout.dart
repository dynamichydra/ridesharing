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
    if (location.startsWith('/wallet')) return 2;
    if (location.startsWith('/profile')) return 3;
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
        context.go('/wallet');
        break;
      case 3:
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
              color: Colors.black.withOpacity(0.04),
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
          selectedItemColor: const Color(0xFF16A34A),
          unselectedItemColor: const Color(0xFF64748B),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_filled),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.assignment_outlined),
              label: 'Trips',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.account_balance_wallet_outlined),
              label: 'Earnings',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
