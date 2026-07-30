import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/error_view.dart';
import '../bloc/home_bloc.dart';
import '../../../location/presentation/widgets/google_map_picker.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    context.read<HomeBloc>().add(LoadHomeData());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: BlocBuilder<HomeBloc, HomeState>(
        builder: (context, state) {
          if (state is HomeLoading) {
            return const LoadingView();
          }

          if (state is HomeError) {
            return ErrorView(
              message: state.message,
              onRetry: () => context.read<HomeBloc>().add(LoadHomeData()),
            );
          }

          if (state is HomeLoaded) {
            return Stack(
              children: [
                // 1. Map Background with live current location fetching
                Positioned.fill(
                  child: GoogleMapPicker(
                    showConfirmButton: false,
                    showMyLocationButton: true,
                    initialPosition: state.currentPosition,
                  ),
                ),

                // 2. Floating Top Header
                Positioned(
                  top: MediaQuery.of(context).padding.top + 8,
                  left: 16,
                  right: 16,
                  child: Container(
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.96),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white, width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF021B47).withOpacity(0.08),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.menu_rounded, color: Color(0xFF021B47)),
                          onPressed: () {
                            context.findRootAncestorStateOfType<ScaffoldState>()?.openDrawer();
                          },
                        ),
                        Expanded(
                          child: InkWell(
                            onTap: () => context.push('/select-location'),
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(
                                      color: Color(0xFFE6F6ED),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.my_location_rounded, color: Color(0xFF01A34D), size: 14),
                                  ),
                                  const SizedBox(width: 8),
                                  const Flexible(
                                    child: Text(
                                      'Current Location',
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF021B47),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF01A34D), size: 18),
                                ],
                              ),
                            ),
                          ),
                        ),
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.notifications_none_rounded, color: Color(0xFF021B47)),
                              onPressed: () => context.push('/notifications'),
                            ),
                            Positioned(
                              top: 10,
                              right: 10,
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF01A34D),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 4),
                      ],
                    ),
                  ),
                ),

                // 3. Floating Bottom Dashboard Sheet
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(28),
                        topRight: Radius.circular(28),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF021B47).withOpacity(0.12),
                          blurRadius: 20,
                          offset: const Offset(0, -6),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 12),
                        // Sheet Drag Handle
                        Center(
                          child: Container(
                            width: 36,
                            height: 4,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade300,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Animated / Highlighted Search Bar Card
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: InkWell(
                            onTap: () => context.push('/select-location'),
                            borderRadius: BorderRadius.circular(18),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF7F9FC),
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(color: const Color(0xFFE2E7E9)),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.02),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF01A34D).withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(Icons.search_rounded, color: Color(0xFF01A34D), size: 20),
                                  ),
                                  const SizedBox(width: 14),
                                  const Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Where to next?',
                                          style: TextStyle(
                                            color: Color(0xFF021B47),
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        SizedBox(height: 2),
                                        Text(
                                          'Search destination or tap saved spot',
                                          style: TextStyle(
                                            color: Color(0xFF8A94A6),
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0165B7).withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Row(
                                      children: const [
                                        Icon(Icons.schedule_rounded, color: Color(0xFF0165B7), size: 14),
                                        SizedBox(width: 4),
                                        Text(
                                          'Now',
                                          style: TextStyle(
                                            color: Color(0xFF0165B7),
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),

                        // Service Modes Banner Grid / Quick Shortcuts
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: Row(
                            children: [
                              Expanded(
                                child: _buildServiceCategoryTile(
                                  title: 'Daily Ride',
                                  subtitle: 'Fast pickups',
                                  badge: 'Popular',
                                  icon: Icons.directions_car_rounded,
                                  iconBgColor: const Color(0xFF01A34D),
                                  onTap: () => context.push('/select-location'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildServiceCategoryTile(
                                  title: 'Cab Share',
                                  subtitle: 'Save up to 40%',
                                  badge: 'Shared',
                                  badgeColor: const Color(0xFFE53935),
                                  icon: Icons.people_alt_rounded,
                                  iconBgColor: const Color(0xFF0165B7),
                                  onTap: () => context.push('/select-location'),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),

                        // Saved Locations Quick Chips Row
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _buildSavedChip(
                                  icon: Icons.home_rounded,
                                  label: 'Home',
                                  address: 'Add address',
                                  color: const Color(0xFF0165B7),
                                  onTap: () => context.push('/select-location'),
                                ),
                                const SizedBox(width: 10),
                                _buildSavedChip(
                                  icon: Icons.work_rounded,
                                  label: 'Work',
                                  address: 'Add address',
                                  color: const Color(0xFF01A34D),
                                  onTap: () => context.push('/select-location'),
                                ),
                                const SizedBox(width: 10),
                                _buildSavedChip(
                                  icon: Icons.star_rounded,
                                  label: 'Saved Places',
                                  address: 'Favorites',
                                  color: Colors.amber.shade700,
                                  onTap: () => context.push('/saved-places'),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Cab Sharing Special Promo Banner
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: InkWell(
                            onTap: () => context.push('/select-location'),
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFF021B47), Color(0xFF0A3B8C)],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF021B47).withOpacity(0.2),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.15),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.groups_rounded, color: Colors.white, size: 26),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            const Text(
                                              'Ryva Cab Sharing',
                                              style: TextStyle(
                                                color: Colors.white,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 15,
                                              ),
                                            ),
                                            const SizedBox(width: 6),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: const BoxDecoration(
                                                color: Color(0xFF01A34D),
                                                borderRadius: BorderRadius.all(Radius.circular(6)),
                                              ),
                                              child: const Text(
                                                'SAVE 40%',
                                                style: TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 3),
                                        const Text(
                                          'Share ride with co-passengers on your route',
                                          style: TextStyle(color: Colors.white70, fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 16),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
              ],
            );
          }

          return const LoadingView();
        },
      ),
    );
  }

  Widget _buildServiceCategoryTile({
    required String title,
    required String subtitle,
    required String badge,
    Color badgeColor = const Color(0xFF01A34D),
    required IconData icon,
    required Color iconBgColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E7E9)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconBgColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconBgColor, size: 22),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF021B47),
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: badgeColor.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          badge,
                          style: TextStyle(
                            color: badgeColor,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSavedChip({
    required IconData icon,
    required String label,
    required String address,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF7F9FC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E7E9)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF021B47),
                  ),
                ),
                Text(
                  address,
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF8A94A6),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
