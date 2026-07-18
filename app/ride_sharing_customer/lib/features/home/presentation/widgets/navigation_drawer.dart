import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../profile/presentation/bloc/profile_bloc.dart';

class AppNavigationDrawer extends StatelessWidget {
  const AppNavigationDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Drawer(
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Custom Modern Header
          Container(
            width: double.infinity,
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + AppSpacing.l,
              left: AppSpacing.l,
              right: AppSpacing.l,
              bottom: AppSpacing.l,
            ),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E52C9), AppColors.primaryBlue],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.only(
                bottomRight: Radius.circular(AppRadius.xl),
              ),
            ),
            child: BlocBuilder<ProfileBloc, ProfileState>(
              builder: (context, state) {
                String userName = 'Guest';
                String? userImage;

                if (state is ProfileInitial) {
                  // Trigger loading details automatically
                  context.read<ProfileBloc>().add(LoadProfile());
                } else if (state is ProfileLoaded) {
                  userName = state.userProfile['name'] as String? ?? 'User';
                  userImage = state.userProfile['profile_picture'] as String?;
                }

                return Row(
                  children: [
                    // Avatar with white boundary
                    Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: CircleAvatar(
                        radius: 28,
                        backgroundColor: Colors.white,
                        backgroundImage: userImage != null
                            ? NetworkImage(userImage)
                            : const NetworkImage(
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
                          Text(
                            userName,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 18,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Gold Member',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.white.withOpacity(0.8),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          const SizedBox(height: AppSpacing.m),
          // Drawer Navigation List
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.m),
              children: [
                _buildDrawerItem(
                  context,
                  icon: Icons.home_rounded,
                  title: 'Home',
                  route: '/home',
                  iconColor: AppColors.primaryBlue,
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.account_balance_wallet_rounded,
                  title: 'Wallet',
                  route: '/wallet',
                  iconColor: AppColors.successGreen,
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.history_rounded,
                  title: 'Ride History',
                  route: '/ride-history',
                  iconColor: AppColors.primaryBlue,
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.notifications_rounded,
                  title: 'Notifications',
                  route: '/notifications',
                  iconColor: AppColors.warningOrange,
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.person_rounded,
                  title: 'Profile Settings',
                  route: '/profile',
                  iconColor: AppColors.primaryBlue,
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.help_rounded,
                  title: 'Help & Support',
                  route: '/help',
                  iconColor: Colors.teal,
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8.0),
                  child: Divider(height: 1),
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.logout_rounded,
                  title: 'Log Out',
                  route: '/login',
                  iconColor: AppColors.errorRed,
                  showTrailing: false,
                  onTap: () {
                    context.read<AuthBloc>().add(LoggedOut());
                    context.go('/login');
                  },
                ),
              ],
            ),
          ),
          // Footer
          Padding(
            padding: const EdgeInsets.only(bottom: 24.0, left: 24.0),
            child: Text(
              'v1.0.2 • Rider App',
              style: TextStyle(
                color: (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary).withOpacity(0.5),
                fontSize: 12,
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
    required Color iconColor,
    bool showTrailing = true,
    VoidCallback? onTap,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.m),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        dense: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.m)),
        onTap: onTap ?? () {
          context.pop(); // Close drawer
          context.push(route);
        },
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
          ),
        ),
        trailing: showTrailing
            ? Icon(
                Icons.chevron_right_rounded,
                color: (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary).withOpacity(0.4),
                size: 20,
              )
            : null,
      ),
    );
  }
}
