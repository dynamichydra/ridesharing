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
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Profile',
          style: TextStyle(color: Color(0xFF021B47), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
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
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                children: [
                  // 1. Profile Summary Row (Avatar + Info + Edit Icon)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Row(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: const Color(0xFFE2E7E9), width: 1.5),
                            image: const DecorationImage(
                              image: AssetImage('assets/images/onboarding_driver.png'),
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                profile['name'] as String? ?? 'Rahul Sharma',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF021B47),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                profile['phone'] as String? ?? '+91 98765 43210',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF8A94A6),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Green edit icon
                        IconButton(
                          icon: const Icon(Icons.edit_outlined, color: Color(0xFF01A34D)),
                          onPressed: () => context.push('/edit-profile'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 2. Menu Links
                  _buildProfileMenuItem(
                    icon: Icons.person_outline_rounded,
                    title: 'Personal Information',
                    onTap: () => context.push('/edit-profile'),
                  ),
                  _buildProfileMenuItem(
                    icon: Icons.payment_rounded,
                    title: 'Payment Methods',
                    onTap: () => context.push('/payment-methods'),
                  ),
                  _buildProfileMenuItem(
                    icon: Icons.location_on_outlined,
                    title: 'My Addresses',
                    onTap: () => context.push('/saved-places'),
                  ),
                  _buildProfileMenuItem(
                    icon: Icons.card_giftcard_rounded,
                    title: 'Refer & Earn',
                    badgeText: 'Get ₹100',
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Refer & Earn flow triggered')),
                      );
                    },
                  ),
                  _buildProfileMenuItem(
                    icon: Icons.directions_car_outlined,
                    title: 'Ride Preferences',
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Ride preferences opened')),
                      );
                    },
                  ),
                  _buildProfileMenuItem(
                    icon: Icons.help_outline_rounded,
                    title: 'Help & Support',
                    onTap: () => context.push('/help'),
                  ),
                  _buildProfileMenuItem(
                    icon: Icons.settings_outlined,
                    title: 'Settings',
                    onTap: () => context.push('/settings'),
                  ),
                  
                  // Logout item
                  _buildProfileMenuItem(
                    icon: Icons.logout_rounded,
                    title: 'Logout',
                    titleColor: const Color(0xFFE53935),
                    onTap: () {
                      // Perform logout
                      context.go('/login');
                    },
                    showDivider: false,
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

  Widget _buildProfileMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    String? badgeText,
    Color titleColor = const Color(0xFF021B47),
    bool showDivider = true,
  }) {
    return Column(
      children: [
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: titleColor.withOpacity(0.06),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: titleColor, size: 20),
          ),
          title: Text(
            title,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 15,
              color: titleColor,
            ),
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (badgeText != null) ...[
                Text(
                  badgeText,
                  style: const TextStyle(
                    color: Color(0xFF01A34D),
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(width: 8),
              ],
              const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.grey),
            ],
          ),
          onTap: onTap,
        ),
        if (showDivider)
          Divider(
            height: 1,
            indent: 52,
            color: Colors.grey.shade100,
          ),
      ],
    );
  }
}
