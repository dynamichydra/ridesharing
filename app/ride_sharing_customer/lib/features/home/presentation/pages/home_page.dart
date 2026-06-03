import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/app_map_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/error_view.dart';
import '../bloc/home_bloc.dart';
import '../widgets/navigation_drawer.dart';
import '../../../booking/presentation/bloc/booking_bloc.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    // Load current position and saved places
    context.read<HomeBloc>().add(LoadHomeData());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      key: _scaffoldKey,
      drawer: const AppNavigationDrawer(),
      body: BlocBuilder<HomeBloc, HomeState>(
        builder: (context, state) {
          if (state is HomeLoading) {
            return const Scaffold(body: LoadingView());
          }

          if (state is HomeError) {
            return Scaffold(
              body: ErrorView(
                message: state.message,
                onRetry: () => context.read<HomeBloc>().add(LoadHomeData()),
              ),
            );
          }

          if (state is HomeLoaded) {
            return Stack(
              children: [
                // 1. Interactive Map fallbacks
                Positioned.fill(
                  child: AppMapView(
                    pickup: state.currentPosition,
                  ),
                ),

                // 2. Floating Top Header
                Positioned(
                  top: MediaQuery.of(context).padding.top + AppSpacing.s,
                  left: AppSpacing.m,
                  right: AppSpacing.m,
                  child: Container(
                    height: 56,
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurface : Colors.white,
                      borderRadius: BorderRadius.circular(AppRadius.m),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.menu_rounded),
                          onPressed: () {
                            _scaffoldKey.currentState?.openDrawer();
                          },
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => context.push('/select-location'),
                            child: Text(
                              'Where to?',
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: AppSpacing.m),
                          child: Icon(Icons.search_rounded, color: AppColors.primaryBlue),
                        ),
                      ],
                    ),
                  ),
                ),

                // 3. Bottom sheet overlay for Saved Places
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.l),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurface : Colors.white,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(AppRadius.xl),
                        topRight: Radius.circular(AppRadius.xl),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 15,
                          offset: const Offset(0, -4),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Center(
                          child: Container(
                            width: 40,
                            height: 4,
                            decoration: BoxDecoration(
                              color: isDark ? Colors.grey[700] : Colors.grey[300],
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.l),
                        Text(
                          'Suggestions',
                          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: AppSpacing.m),
                        // Quick Action Buttons (Home, Work)
                        IntrinsicHeight(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: state.savedPlaces.map((place) {
                              IconData placeIcon = Icons.star_border_rounded;
                              if (place['type'] == 'home') placeIcon = Icons.home_rounded;
                              if (place['type'] == 'work') placeIcon = Icons.work_rounded;

                              return Expanded(
                                child: Card(
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  child: InkWell(
                                    onTap: () {
                                      final pickup = state.currentPosition;
                                      final dest = LatLng(place['latitude'] as double, place['longitude'] as double);

                                      // Set pickup and destination in BookingBloc
                                      context.read<BookingBloc>().add(
                                        SetRideLocations(
                                          pickup: pickup,
                                          pickupName: 'Current Location',
                                          pickupAddress: 'UB City, Bengaluru, KA',
                                          destination: dest,
                                          destinationName: place['name'] as String,
                                          destinationAddress: place['address'] as String,
                                        ),
                                      );
                                      context.push('/ride-options');
                                    },
                                    borderRadius: BorderRadius.circular(AppRadius.l),
                                    child: Padding(
                                      padding: const EdgeInsets.all(AppSpacing.m),
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(placeIcon, color: AppColors.primaryBlue),
                                          const SizedBox(height: 8),
                                          Text(
                                            place['name'] as String,
                                            textAlign: TextAlign.center,
                                            style: const TextStyle(fontWeight: FontWeight.bold),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            place['type'].toString().toUpperCase(),
                                            style: theme.textTheme.bodyMedium?.copyWith(fontSize: 10),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.l),
                        // Search trigger bar
                        InkWell(
                          onTap: () => context.push('/select-location'),
                          child: Container(
                            padding: const EdgeInsets.all(AppSpacing.m),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
                              borderRadius: BorderRadius.circular(AppRadius.m),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.history_rounded, color: Colors.grey),
                                const SizedBox(width: AppSpacing.m),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Kempegowda International Airport (BLR)',
                                        style: TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                      Text(
                                        'KIAL Rd, Devanahalli, Bengaluru, Karnataka',
                                        style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          }

          return const Scaffold(body: LoadingView());
        },
      ),
    );
  }
}
