import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class AppNavigationDrawer extends StatelessWidget {
  const AppNavigationDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Ryva Ride Brand Header Logo
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: Image.asset(
                  'assets/logos/main-logo.jpeg', 
                  height: 60,
              ),
            ),
          ),
          const Divider(height: 1),

          // Drawer Navigation List
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              children: [
                _buildDrawerItem(
                  context,
                  icon: Icons.home_outlined,
                  title: 'Home',
                  route: '/home',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.directions_car_outlined,
                  title: 'My Rides',
                  route: '/ride-history',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.account_balance_wallet_outlined,
                  title: 'Wallet',
                  route: '/wallet',
                ),
                // _buildDrawerItem(
                //   context,
                //   icon: Icons.location_on_outlined,
                //   title: 'My Addresses',
                //   route: '/saved-places',
                // ),
                // _buildDrawerItem(
                //   context,
                //   icon: Icons.card_giftcard_rounded,
                //   title: 'Refer & Earn',
                //   route: '/profile', // Fallback route
                //   badgeText: 'Get ₹100',
                // ),
                _buildDrawerItem(
                  context,
                  icon: Icons.help_outline_rounded,
                  title: 'Help & Support',
                  route: '/help',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.settings_outlined,
                  title: 'Settings',
                  route: '/settings',
                ),
                
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8.0),
                  child: Divider(height: 1),
                ),
                
                // Logout Menu Button
                ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                  leading: const Icon(Icons.logout_rounded, color: Color(0xFFE53935), size: 20),
                  title: const Text(
                    'Logout',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFE53935),
                    ),
                  ),
                  onTap: () async {
                    Navigator.of(context).pop(); // Dismiss drawer
                    context.read<AuthBloc>().add(LoggedOut());
                    await Future.delayed(const Duration(milliseconds: 100));
                    if (context.mounted) {
                      context.go('/login');
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String route,
    String? badgeText,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 12),
      leading: Icon(icon, color: const Color(0xFF021B47), size: 20),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Color(0xFF021B47),
        ),
      ),
      trailing: badgeText != null
          ? Text(
              badgeText,
              style: const TextStyle(
                color: Color(0xFF01A34D),
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            )
          : null,
      onTap: () {
        context.pop(); // Close drawer
        const tabRoutes = ['/home', '/ride-history', '/wallet', '/profile'];
        if (tabRoutes.contains(route)) {
          context.go(route);
        } else {
          context.push(route);
        }
      },
    );
  }
}
