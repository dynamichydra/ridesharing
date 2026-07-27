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
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.menu_rounded, color: Colors.black87),
                          onPressed: () {
                            context.findRootAncestorStateOfType<ScaffoldState>()?.openDrawer();
                          },
                        ),
                        Expanded(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Text(
                                'Current Location',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF021B47),
                                ),
                              ),
                              SizedBox(width: 4),
                              Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF01A34D), size: 18),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.notifications_none_rounded, color: Colors.black87),
                          onPressed: () => context.push('/notifications'),
                        ),
                      ],
                    ),
                  ),
                ),

                // 3. Floating Bottom Search and Suggestions Card
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(24),
                        topRight: Radius.circular(24),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 12,
                          offset: Offset(0, -4),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(height: 12),
                        // Handle bar
                        Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade300,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(height: 16),
                        
                        // Search bar input card
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: InkWell(
                            onTap: () => context.push('/select-location'),
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFFE2E7E9)),
                              ),
                              child: Row(
                                children: const [
                                  Icon(Icons.search_rounded, color: Color(0xFF01A34D), size: 22),
                                  SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      'Where are you going?',
                                      style: TextStyle(
                                        color: Color(0xFF8A94A6),
                                        fontSize: 15,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                  Icon(Icons.star_border_rounded, color: Colors.grey, size: 20),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Suggestions / Shortcuts row
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _buildShortcutItem(
                                icon: Icons.home_filled,
                                label: 'Home',
                                subtext: 'Add home',
                                color: const Color(0xFF0165B7),
                                onTap: () => context.push('/select-location'),
                              ),
                              _buildShortcutItem(
                                icon: Icons.work_rounded,
                                label: 'Work',
                                subtext: 'Add work',
                                color: const Color(0xFF01A34D),
                                onTap: () => context.push('/select-location'),
                              ),
                              _buildShortcutItem(
                                icon: Icons.flight_takeoff_rounded,
                                label: 'Airport',
                                subtext: 'Add place',
                                color: Colors.amber.shade700,
                                onTap: () => context.push('/select-location'),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Popular Rides Section
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Popular Rides',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF021B47),
                                ),
                              ),
                              TextButton(
                                onPressed: () => context.push('/select-location'),
                                child: const Text(
                                  'View all',
                                  style: TextStyle(color: Color(0xFF0165B7), fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // List of popular rides
                        SizedBox(
                          height: 84,
                          child: ListView(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            children: [
                              _buildPopularRideItem(
                                type: 'Ryva Go',
                                time: '2 min away',
                                capacity: 4,
                                price: '₹125',
                                asset: 'assets/images/onboarding_driver.png', // Fallback local image
                              ),
                              _buildPopularRideItem(
                                type: 'Ryva Share',
                                time: '3 min away',
                                capacity: 3,
                                price: '₹90',
                                asset: 'assets/images/onboarding_driver.png',
                              ),
                              _buildPopularRideItem(
                                type: 'Ryva XL',
                                time: '4 min away',
                                capacity: 4,
                                price: '₹200',
                                asset: 'assets/images/onboarding_driver.png',
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
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

  Widget _buildShortcutItem({
    required IconData icon,
    required String label,
    required String subtext,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.28,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E7E9)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
            ),
            const SizedBox(height: 2),
            Text(
              subtext,
              style: const TextStyle(fontSize: 10, color: Color(0xFF8A94A6)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPopularRideItem({
    required String type,
    required String time,
    required int capacity,
    required String price,
    required String asset,
  }) {
    return Container(
      width: 180,
      margin: const EdgeInsets.symmetric(horizontal: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E7E9)),
      ),
      child: Row(
        children: [
          // Vehicle Image/Icon fallback
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFF01A34D).withOpacity(0.06),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.directions_car_filled_rounded, color: Color(0xFF01A34D), size: 26),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  type,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                ),
                const SizedBox(height: 2),
                Text(
                  '$time • 👤$capacity',
                  style: const TextStyle(fontSize: 10, color: Color(0xFF8A94A6)),
                ),
              ],
            ),
          ),
          Text(
            price,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
          ),
        ],
      ),
    );
  }
}
