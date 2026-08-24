import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/profile/presentation/bloc/profile_bloc.dart';

class AppDrawer extends StatelessWidget {
  final VoidCallback? onLogout;

  const AppDrawer({super.key, this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: Colors.white,
      child: BlocBuilder<ProfileBloc, ProfileState>(
        builder: (context, state) {
          String driverName = 'Driver Partner';
          String driverRating = '5.0';
          String? profilePhoto;

          if (state is ProfileLoaded) {
            final p = state.profile;
            if (p.name != null && p.name!.trim().isNotEmpty) {
              driverName = p.name!.trim();
            }
            if (p.rating > 0) {
              driverRating = p.rating.toStringAsFixed(1);
            }
            if (p.profilePhoto != null && p.profilePhoto!.isNotEmpty) {
              profilePhoto = p.profilePhoto;
            }
          } else {
            final authState = context.read<AuthBloc>().state;
            if (authState is Authenticated) {
              final d = authState.driver;
              if (d.name != null && d.name!.trim().isNotEmpty) {
                driverName = d.name!.trim();
              }
              if (d.rating > 0) {
                driverRating = d.rating.toStringAsFixed(1);
              }
              if (d.profilePhoto != null && d.profilePhoto!.isNotEmpty) {
                profilePhoto = d.profilePhoto;
              }
            }
          }

          final currentLocation = GoRouterState.of(context).uri.path;

          return Column(
            children: [
              // Header
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(
                  top: 60,
                  left: 24,
                  right: 24,
                  bottom: 24,
                ),
                decoration: const BoxDecoration(color: Color(0xFF009048)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 60,
                      height: 60,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      clipBehavior: Clip.antiAlias,
                      alignment: Alignment.center,
                      child: (profilePhoto != null && profilePhoto.isNotEmpty)
                          ? Image.network(
                              profilePhoto,
                              width: 60,
                              height: 60,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(
                                Icons.person,
                                color: Color(0xFF009048),
                                size: 34,
                              ),
                            )
                          : const Icon(
                              Icons.person,
                              color: Color(0xFF009048),
                              size: 34,
                            ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      driverName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.star_rounded,
                          color: Colors.amber,
                          size: 16,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          driverRating,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Drawer navigation items
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  children: [
                    _buildDrawerItem(
                      context: context,
                      icon: Icons.home_rounded,
                      title: 'Home',
                      route: '/dashboard',
                      isSelected: currentLocation == '/dashboard',
                    ),
                    _buildDrawerItem(
                      context: context,
                      icon: Icons.assignment_outlined,
                      title: 'Rides History',
                      route: '/ride-history',
                      isSelected: currentLocation.startsWith('/ride-history'),
                    ),
                    _buildDrawerItem(
                      context: context,
                      icon: Icons.monetization_on_outlined,
                      title: 'Earnings',
                      route: '/earnings',
                      isSelected: currentLocation.startsWith('/earnings'),
                    ),
                    _buildDrawerItem(
                      context: context,
                      icon: Icons.account_balance_wallet_outlined,
                      title: 'Wallet',
                      route: '/wallet',
                      isSelected: currentLocation.startsWith('/wallet'),
                    ),
                    _buildDrawerItem(
                      context: context,
                      icon: Icons.person_outline_rounded,
                      title: 'Profile',
                      route: '/profile',
                      isSelected: currentLocation.startsWith('/profile'),
                    ),
                    _buildDrawerItem(
                      context: context,
                      icon: Icons.directions_car_outlined,
                      title: 'Vehicle Info',
                      route: '/vehicle-info',
                      isSelected: currentLocation.startsWith('/vehicle-info'),
                    ),
                    _buildDrawerItem(
                      context: context,
                      icon: Icons.settings_outlined,
                      title: 'Settings',
                      route: '/settings',
                      isSelected: currentLocation.startsWith('/settings'),
                    ),
                  ],
                ),
              ),

              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.logout_rounded, color: Color(0xFFE53935)),
                title: const Text(
                  'Logout',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFE53935),
                  ),
                ),
                onTap: () {
                  Navigator.pop(context);
                  if (onLogout != null) {
                    onLogout!();
                  } else {
                    context.read<AuthBloc>().add(LogoutRequested());
                  }
                },
              ),
              const SizedBox(height: 20),
            ],
          );
        },
      ),
    );
  }

  Widget _buildDrawerItem({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String route,
    required bool isSelected,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFFE6F4EA) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isSelected ? const Color(0xFF009048) : const Color(0xFF0F172A),
          size: 22,
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? const Color(0xFF009048) : const Color(0xFF0F172A),
            fontSize: 14,
          ),
        ),
        dense: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        onTap: () {
          Navigator.pop(context);
          if (!isSelected) {
            context.go(route);
          }
        },
      ),
    );
  }
}
