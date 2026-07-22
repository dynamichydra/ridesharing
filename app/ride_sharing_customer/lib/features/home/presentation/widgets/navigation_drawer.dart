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
              child: Row(
                children: [
                  // Ryva Ride Logo Symbol
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF01A34D).withOpacity(0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'R',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF01A34D),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Row(
                    children: const [
                      Text(
                        'Ryva ',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF01A34D),
                        ),
                      ),
                      Text(
                        'Ride',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0165B7),
                        ),
                      ),
                    ],
                  ),
                ],
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
                _buildDrawerItem(
                  context,
                  icon: Icons.location_on_outlined,
                  title: 'My Addresses',
                  route: '/saved-places',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.card_giftcard_rounded,
                  title: 'Refer & Earn',
                  route: '/profile', // Fallback route
                  badgeText: 'Get ₹100',
                ),
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
                  onTap: () {
                    context.read<AuthBloc>().add(LoggedOut());
                    context.go('/login');
                  },
                ),
              ],
            ),
          ),

          // Footer
          const Padding(
            padding: EdgeInsets.only(bottom: 24.0, left: 28.0),
            child: Text(
              'v1.0.2 • Rider App',
              style: TextStyle(
                color: Color(0xFF8A94A6),
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
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
        context.push(route);
      },
    );
  }
}
