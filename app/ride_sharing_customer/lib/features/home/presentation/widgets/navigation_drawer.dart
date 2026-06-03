import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class AppNavigationDrawer extends StatelessWidget {
  const AppNavigationDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Drawer(
      backgroundColor: theme.colorScheme.background,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Custom Modern Header
          Container(
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + AppSpacing.l,
              left: AppSpacing.l,
              right: AppSpacing.l,
              bottom: AppSpacing.l,
            ),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : theme.colorScheme.primary,
              borderRadius: const BorderRadius.only(
                bottomRight: Radius.circular(AppRadius.xl),
              ),
            ),
            child: Row(
              children: [
                // Avatar with white boundary
                Container(
                  padding: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white24,
                  ),
                  child: const CircleAvatar(
                    radius: 28,
                    backgroundImage: NetworkImage(
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.m),
                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Alex Morgan',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.m),
          // Drawer Navigation List
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s),
              children: [
                _buildDrawerItem(
                  context,
                  icon: Icons.home_rounded,
                  title: 'Home',
                  route: '/home',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.account_balance_wallet_rounded,
                  title: 'Wallet',
                  route: '/wallet',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.history_rounded,
                  title: 'Ride History',
                  route: '/ride-history',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.notifications_rounded,
                  title: 'Notifications',
                  route: '/notifications',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.person_rounded,
                  title: 'Profile Settings',
                  route: '/profile',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.help_rounded,
                  title: 'Help & Support',
                  route: '/help',
                ),
              ],
            ),
          ),
          const Divider(),
          // Logout
          Padding(
            padding: const EdgeInsets.all(AppSpacing.s),
            child: ListTile(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.m),
              ),
              leading: Icon(Icons.logout_rounded, color: theme.colorScheme.error),
              title: Text(
                'Log Out',
                style: TextStyle(
                  color: theme.colorScheme.error,
                  fontWeight: FontWeight.bold,
                ),
              ),
              onTap: () {
                context.read<AuthBloc>().add(LoggedOut());
                context.go('/login');
              },
            ),
          ),
          const SizedBox(height: AppSpacing.m),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String route,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2, horizontal: AppSpacing.s),
      child: ListTile(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.m),
        ),
        leading: Icon(icon, color: isDark ? Colors.white70 : theme.colorScheme.primary),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        onTap: () {
          context.pop(); // Close drawer
          context.push(route);
        },
      ),
    );
  }
}
