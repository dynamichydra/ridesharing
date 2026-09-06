import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../bloc/home_bloc.dart';
import '../../../profile/presentation/bloc/profile_bloc.dart';
import '../../../ride_tracking/presentation/bloc/ride_tracking_bloc.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late final PageController _pageController;
  int _activePromoPage = 0;
  Timer? _promoTimer;
  static const int _realPromoCount = 3;
  static const int _infiniteMultiplier = 1000;
  late int _currentPageIndex;

  @override
  void initState() {
    super.initState();
    // Start at the middle multiple so user can scroll left or right infinitely
    _currentPageIndex = (_infiniteMultiplier ~/ 2) * _realPromoCount;
    _pageController = PageController(initialPage: _currentPageIndex);
    _activePromoPage = _currentPageIndex % _realPromoCount;
    context.read<HomeBloc>().add(LoadHomeData());
    _startPromoAutoSlide();
  }

  void _startPromoAutoSlide() {
    _promoTimer?.cancel();
    _promoTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (!_pageController.hasClients) return;
      _currentPageIndex++;
      _pageController.animateToPage(
        _currentPageIndex,
        duration: const Duration(milliseconds: 650),
        curve: Curves.easeInOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _promoTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _handleBookingTap({Map<String, dynamic>? destinationPlace}) {
    final trackingState = context.read<RideTrackingBloc>().state;
    final bool hasActiveRide = (trackingState is RideTrackingActive &&
            trackingState.trackingState != 'rideCompleted') ||
        trackingState is RideTrackingSearching;
    if (hasActiveRide) {
      CustomToast.show(
        context,
        'You already have an active ride in progress.',
      );
      return;
    }

    if (destinationPlace != null) {
      final name = (destinationPlace['name'] ?? destinationPlace['label'] ?? 'Destination').toString();
      final address = (destinationPlace['address'] ?? name).toString();
      final lat = double.tryParse((destinationPlace['latitude'] ?? destinationPlace['lat'] ?? '').toString()) ?? 22.5726;
      final lng = double.tryParse((destinationPlace['longitude'] ?? destinationPlace['lng'] ?? '').toString()) ?? 88.3639;

      context.push('/select-location', extra: {
        'destinationName': name,
        'destinationAddress': address,
        'destinationLat': lat,
        'destinationLng': lng,
      });
    } else {
      context.push('/select-location');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: Color(0xFF0F172A), size: 26),
          onPressed: () {
            context.findRootAncestorStateOfType<ScaffoldState>()?.openDrawer();
          },
        ),
        centerTitle: true,
        title: Image.asset(
          'assets/logos/text-logo.png',
          height: 24,
          fit: BoxFit.contain,
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: () => context.push('/notifications'),
              child: Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.center,
                children: [
                  const Icon(
                    Icons.notifications_rounded,
                    color: Color(0xFF0F172A),
                    size: 26,
                  ),
                  Positioned(
                    top: 2,
                    right: 2,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFFE53935),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      body: MultiBlocListener(
        listeners: [
          BlocListener<ProfileBloc, ProfileState>(
            listener: (context, profileState) {
              if (profileState is ProfileLoaded) {
                context.read<HomeBloc>().add(LoadHomeData());
              }
            },
          ),
          BlocListener<RideTrackingBloc, RideTrackingState>(
            listener: (context, trackingState) {
              if (trackingState is RideTrackingCancelled) {
                CustomToast.show(context, trackingState.message);
              }
            },
          ),
        ],
        child: BlocBuilder<HomeBloc, HomeState>(
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
              List<Map<String, dynamic>> allSavedPlaces = List<Map<String, dynamic>>.from(state.savedPlaces);

              final profileState = context.read<ProfileBloc>().state;
              if (profileState is ProfileLoaded) {
                final profSaved = profileState.userProfile['saved_places'] as List? ?? [];
                if (profSaved.isNotEmpty) {
                  allSavedPlaces = profSaved.map((e) => Map<String, dynamic>.from(e as Map)).toList();
                }
              }

              Map<String, dynamic>? homePlace;
              Map<String, dynamic>? workPlace;

              for (final p in allSavedPlaces) {
                final label = (p['label'] ?? p['type'] ?? '').toString().toLowerCase();
                if (label == 'home' && homePlace == null) {
                  homePlace = Map<String, dynamic>.from(p);
                } else if (label == 'work' && workPlace == null) {
                  workPlace = Map<String, dynamic>.from(p);
                }
              }

              final savedPlaces = allSavedPlaces;

            return SafeArea(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Active Ride Banner (Customer App)
                      BlocBuilder<RideTrackingBloc, RideTrackingState>(
                        builder: (context, trackState) {
                          if (trackState is RideTrackingActive && trackState.trackingState != 'rideCompleted') {
                            String title = 'Trip in Progress';
                            String subtitle = 'Tap to view live trip route';
                            if (trackState.trackingState == 'driverAccepted') {
                              title = 'Driver Assigned (${trackState.driverName})';
                              subtitle = 'Driver is heading to your pickup';
                            } else if (trackState.trackingState == 'driverArriving') {
                              title = 'Driver Arriving (${trackState.driverName})';
                              subtitle = 'Driver is near your pickup point';
                            } else if (trackState.trackingState == 'driverArrived' || trackState.trackingState == 'otpVerification') {
                              title = 'Driver Arrived! OTP: ${trackState.otp}';
                              subtitle = 'Share OTP with driver to start ride';
                            } else if (trackState.trackingState == 'rideInProgress') {
                              title = 'On the way to ${trackState.destinationName}';
                              subtitle = 'Tap to track your live journey';
                            }

                            return GestureDetector(
                              onTap: () => context.push('/ride-tracking'),
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 16),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF009048), Color(0xFF007A3D)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF009048).withValues(alpha: 0.3),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.2),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.navigation_rounded, color: Colors.white, size: 20),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            title,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            subtitle,
                                            style: const TextStyle(color: Colors.white70, fontSize: 12),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 14),
                                  ],
                                ),
                              ),
                            );
                          } else if (trackState is RideTrackingSearching) {
                            return GestureDetector(
                              onTap: () => context.push('/ride-tracking'),
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 16),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF021B47), Color(0xFF0F3B82)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF021B47).withValues(alpha: 0.25),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.15),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    const Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Finding your driver...',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                            ),
                                          ),
                                          SizedBox(height: 2),
                                          Text(
                                            'Matching with nearby drivers',
                                            style: TextStyle(color: Colors.white70, fontSize: 12),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 14),
                                  ],
                                ),
                              ),
                            );
                          }
                          return const SizedBox.shrink();
                        },
                      ),

                      // Header title
                      const Text(
                        'Where are you going?',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0B1B2B),
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Search Destination Bar
                      _buildSearchBar(),
                      const SizedBox(height: 18),

                      // Quick Action Cards (Home, Work, Saved)
                      Row(
                        children: [
                          Expanded(
                            child: _buildQuickCard(
                              icon: Icons.home_rounded,
                              iconColor: homePlace != null ? const Color(0xFF00A859) : const Color(0xFF94A3B8),
                              title: 'Home',
                              subtitle: homePlace != null
                                  ? (homePlace['address'] != null && homePlace['address'].toString().isNotEmpty
                                      ? homePlace['address'].toString()
                                      : (homePlace['name'] ?? 'Saved').toString())
                                  : 'Not added',
                              isMuted: homePlace == null,
                              onTap: () {
                                if (homePlace != null) {
                                  _handleBookingTap(destinationPlace: homePlace);
                                } else {
                                  CustomToast.show(context, 'Home address not added. Go to Saved Places to add it.');
                                  context.push('/saved-places');
                                }
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildQuickCard(
                              icon: Icons.work_rounded,
                              iconColor: workPlace != null ? const Color(0xFF0077E6) : const Color(0xFF94A3B8),
                              title: 'Work',
                              subtitle: workPlace != null
                                  ? (workPlace['address'] != null && workPlace['address'].toString().isNotEmpty
                                      ? workPlace['address'].toString()
                                      : (workPlace['name'] ?? 'Saved').toString())
                                  : 'Not added',
                              isMuted: workPlace == null,
                              onTap: () {
                                if (workPlace != null) {
                                  _handleBookingTap(destinationPlace: workPlace);
                                } else {
                                  CustomToast.show(context, 'Work address not added. Go to Saved Places to add it.');
                                  context.push('/saved-places');
                                }
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildQuickCard(
                              icon: Icons.star_rounded,
                              iconColor: const Color(0xFFFFB300),
                              title: 'Saved',
                              subtitle: savedPlaces.isNotEmpty
                                  ? '${savedPlaces.length} Places'
                                  : 'Add Place',
                              isMuted: false,
                              onTap: () => context.push('/saved-places'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Promotional Banner
                      _buildPromoBanner(),
                      const SizedBox(height: 28),

                      // Recent Destinations Section
                      _buildRecentDestinationsSection(state.recentRides),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            );
          }

          return const LoadingView();
        },
      ),
    ),
  );
}

  Widget _buildSearchBar() {
    return InkWell(
      onTap: _handleBookingTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 54,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: const Color(0xFFF6F8FB),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE5E9F0), width: 1.2),
        ),
        child: const Row(
          children: [
            Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 24),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Search destination',
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 15,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool isMuted = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Opacity(
        opacity: isMuted ? 0.6 : 1.0,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: isMuted ? const Color(0xFFF1F5F9) : const Color(0xFFF7F9FC),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isMuted ? const Color(0xFFE2E8F0) : const Color(0xFFEDF2F7),
            ),
          ),
          child: Row(
            children: [
              Icon(icon, color: iconColor, size: 26),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isMuted ? const Color(0xFF64748B) : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        color: isMuted ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPromoBanner() {
    final promoItems = [
      {
        'image': 'assets/promo-banners/promo-1.png',
        'route': '/promo-codes',
      },
      {
        'image': 'assets/promo-banners/promo-2.png',
        'route': '/select-location',
      },
      {
        'image': 'assets/promo-banners/promo-3.png',
        'route': '/profile',
      },
    ];

    return AspectRatio(
      aspectRatio: 2.15,
      child: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          // Banner Image Slider
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              _currentPageIndex = index;
              setState(() {
                _activePromoPage = index % promoItems.length;
              });
            },
            itemBuilder: (context, index) {
              final item = promoItems[index % promoItems.length];
              return InkWell(
                onTap: () => context.push(item['route']!),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: Image.asset(
                      item['image']!,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              );
            },
          ),

          // Slider Indicator Dots inside the image bottom center
          Positioned(
            bottom: 12,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(
                promoItems.length,
                (index) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: GestureDetector(
                    onTap: () {
                      final currentGroup = _currentPageIndex - (_currentPageIndex % promoItems.length);
                      final targetIndex = currentGroup + index;
                      _pageController.animateToPage(
                        targetIndex,
                        duration: const Duration(milliseconds: 350),
                        curve: Curves.easeInOut,
                      );
                    },
                    child: _buildDot(isActive: _activePromoPage == index),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDot({required bool isActive}) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      width: isActive ? 18 : 6,
      height: 6,
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFF009048) : Colors.white.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(3),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentDestinationsSection(List<Map<String, dynamic>> recentRides) {
    if (recentRides.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 24.0, horizontal: 16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset(
                'assets/images/no_recent_history.png',
                width: 220,
                fit: BoxFit.contain,
              ),
              const SizedBox(height: 20),
              const Text(
                'No recent destinations yet',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Your recent rides will appear here\nfor quick access.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: Color(0xFF94A3B8),
                  height: 1.4,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final displayRides = recentRides.take(3).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Recent destinations',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0B1B2B),
            letterSpacing: -0.3,
          ),
        ),
        const SizedBox(height: 12),
        ...displayRides.asMap().entries.map((entry) {
          final isLast = entry.key == displayRides.length - 1;
          final ride = entry.value;

          String title = '';
          String subtitle = '';

          if (ride.containsKey('dropAddress') && (ride['dropAddress'] ?? '').toString().isNotEmpty) {
            final address = (ride['dropAddress'] ?? '').toString().trim();
            final parts = address.split(',').map((p) => p.trim()).where((p) => p.isNotEmpty).toList();
            if (parts.length <= 2) {
              title = parts.join(', ');
              subtitle = (ride['pickupAddress'] ?? 'Recent Ride').toString();
            } else {
              title = parts.take(2).join(', ');
              subtitle = parts.sublist(2).join(', ');
            }
          } else {
            title = ride['title'] ?? 'Destination';
            subtitle = ride['subtitle'] ?? '';
          }

          final destLat = double.tryParse((ride['dropLat'] ?? ride['drop_lat'] ?? '').toString());
          final destLng = double.tryParse((ride['dropLng'] ?? ride['drop_lng'] ?? '').toString());

          return Column(
            children: [
              _buildRecentDestinationItem(
                title: title,
                subtitle: subtitle,
                onTap: () => _handleBookingTap(
                  destinationPlace: {
                    'name': title,
                    'address': (ride['dropAddress'] ?? ride['drop_address'] ?? title).toString(),
                    'latitude': destLat,
                    'longitude': destLng,
                  },
                ),
              ),
              if (!isLast)
                const Padding(
                  padding: EdgeInsets.only(left: 48),
                  child: Divider(
                    height: 1,
                    thickness: 1,
                    color: Color(0xFFF1F5F9),
                  ),
                ),
            ],
          );
        }),
      ],
    );
  }

  Widget _buildRecentDestinationItem({
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14.0, horizontal: 4.0),
        child: Row(
          children: [
            // Circular clock icon
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.access_time_rounded,
                color: Color(0xFF334155),
                size: 20,
              ),
            ),
            const SizedBox(width: 14),

            // Title and Subtitle
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF94A3B8),
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),

            // Trailing Chevron
            const Icon(
              Icons.chevron_right_rounded,
              color: Color(0xFF94A3B8),
              size: 22,
            ),
          ],
        ),
      ),
    );
  }
}

