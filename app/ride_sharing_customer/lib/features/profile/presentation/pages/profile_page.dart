import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/error_view.dart';
import '../bloc/profile_bloc.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  @override
  void initState() {
    super.initState();
    context.read<ProfileBloc>().add(LoadProfile());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocBuilder<ProfileBloc, ProfileState>(
        builder: (context, state) {
          if (state is ProfileLoading) {
            return const LoadingView();
          }

          if (state is ProfileError) {
            return ErrorView(
              message: state.message,
              onRetry: () => context.read<ProfileBloc>().add(LoadProfile()),
            );
          }

          if (state is ProfileLoaded) {
            final profile = state.userProfile;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.m),
              child: Column(
                children: [
                  // 1. Profile Summary Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.l),
                      child: Column(
                        children: [
                          CircleAvatar(
                            radius: 50,
                            backgroundImage: NetworkImage(
                              profile['profile_picture'] as String? ??
                                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
                            ),
                          ),
                          const SizedBox(height: AppSpacing.m),
                          Text(
                            profile['name'] as String? ?? 'Alex Morgan',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            profile['email'] as String? ?? 'alex.morgan@hovr.com',
                            style: theme.textTheme.bodyMedium,
                          ),
                          const SizedBox(height: 8),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // 2. Menu Links
                  _buildMenuCard(
                    context,
                    icon: Icons.person_outline_rounded,
                    title: 'Edit Profile',
                    subtitle: 'Modify name, email, and phone details',
                    route: '/edit-profile',
                  ),
                  _buildMenuCard(
                    context,
                    icon: Icons.place_outlined,
                    title: 'Saved Places',
                    subtitle: 'Manage Home, Work, and favorite venues',
                    route: '/saved-places',
                  ),
                  _buildMenuCard(
                    context,
                    icon: Icons.payment_rounded,
                    title: 'Payment Methods',
                    subtitle: 'Manage credit cards and secure wallets',
                    route: '/payment-methods',
                  ),
                  _buildMenuCard(
                    context,
                    icon: Icons.history_rounded,
                    title: 'Ride History',
                    subtitle: 'View past trips and invoice breakdowns',
                    route: '/ride-history',
                  ),
                  _buildMenuCard(
                    context,
                    icon: Icons.settings_outlined,
                    title: 'App Settings',
                    subtitle: 'Toggle dark mode and system preferences',
                    route: '/settings',
                  ),
                  _buildMenuCard(
                    context,
                    icon: Icons.help_outline_rounded,
                    title: 'Help & Support',
                    subtitle: 'View FAQs and reach out to team support',
                    route: '/help',
                  ),
                ],
              ),
            );
          }

          return const Center(child: CircularProgressIndicator());
        },
      ),
    );
  }

  Widget _buildMenuCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required String route,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.s),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(AppSpacing.s),
          decoration: BoxDecoration(
            color: isDark ? Colors.grey[850] : Colors.grey[100],
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: AppColors.primaryBlue),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          subtitle,
          style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
        ),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey),
        onTap: () => context.push(route),
      ),
    );
  }
}
