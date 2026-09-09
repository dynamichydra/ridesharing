import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../bloc/profile_bloc.dart';

class RideHistoryPage extends StatefulWidget {
  const RideHistoryPage({super.key});

  @override
  State<RideHistoryPage> createState() => _RideHistoryPageState();
}

class _RideHistoryPageState extends State<RideHistoryPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this, initialIndex: 1);
    _tabController.addListener(() {
      setState(() {});
    });
    context.read<ProfileBloc>().add(LoadRideHistoryEvent());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isCancelledTab = _tabController.index == 2;
    final activeColor = isCancelledTab
        ? const Color(0xFFE53935)
        : const Color(0xFF009048);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(
            Icons.menu_rounded,
            color: Color(0xFF0A2540),
            size: 24,
          ),
          onPressed: () => Scaffold.of(context).openDrawer(),
        ),
        title: const Text(
          'My Rides',
          style: TextStyle(
            color: Color(0xFF0A2540),
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: TabBar(
            controller: _tabController,
            dividerColor: Colors.transparent,
            dividerHeight: 0,
            indicatorColor: activeColor,
            indicatorWeight: 3,
            indicatorSize: TabBarIndicatorSize.tab,
            indicatorPadding: const EdgeInsets.symmetric(horizontal: 16),
            labelStyle: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
            unselectedLabelStyle: const TextStyle(
              fontWeight: FontWeight.w500,
              fontSize: 15,
            ),
            unselectedLabelColor: const Color(0xFF64748B),
            tabs: [
              Tab(
                child: Text(
                  'Upcoming',
                  style: TextStyle(
                    color: _tabController.index == 0
                        ? const Color(0xFF009048)
                        : const Color(0xFF64748B),
                  ),
                ),
              ),
              Tab(
                child: Text(
                  'Completed',
                  style: TextStyle(
                    color: _tabController.index == 1
                        ? const Color(0xFF009048)
                        : const Color(0xFF64748B),
                  ),
                ),
              ),
              Tab(
                child: Text(
                  'Cancelled',
                  style: TextStyle(
                    color: _tabController.index == 2
                        ? const Color(0xFFE53935)
                        : const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      body: BlocBuilder<ProfileBloc, ProfileState>(
        builder: (context, state) {
          if (state is ProfileLoading) {
            return const Center(
              child: CircularProgressIndicator(
                color: Color(0xFF009048),
                strokeWidth: 3,
              ),
            );
          }

          if (state is ProfileLoaded) {
            final allRides = state.rideHistory;

            // Categorize based on backend DB status values:
            // 1. Upcoming: 'searching', 'accepted', 'arriving', 'started'
            final upcomingRides = allRides.where((r) {
              final status = (r['status'] as String? ?? '').toLowerCase();
              return status == 'searching' ||
                  status == 'accepted' ||
                  status == 'arriving' ||
                  status == 'started';
            }).toList();

            // 2. Completed: 'completed'
            final completedRides = allRides.where((r) {
              final status = (r['status'] as String? ?? '').toLowerCase();
              return status == 'completed';
            }).toList();

            // 3. Cancelled: 'cancelled'
            final cancelledRides = allRides.where((r) {
              final status = (r['status'] as String? ?? '').toLowerCase();
              return status == 'cancelled';
            }).toList();

            return RefreshIndicator(
              color: const Color(0xFF009048),
              onRefresh: () async {
                context.read<ProfileBloc>().add(LoadRideHistoryEvent());
              },
              child: TabBarView(
                controller: _tabController,
                children: [
                  // 1. Upcoming Tab
                  _buildRideList(
                    title: 'Active Trips',
                    rides: upcomingRides,
                    emptyAsset: 'assets/images/rides-upcoming.png',
                    emptyTitle: 'No Active Trips',
                    emptySubtitle: "You don't have any active or upcoming trips.",
                    showBookButton: true,
                  ),

                  // 2. Completed Tab
                  _buildRideList(
                    title: 'Completed Rides',
                    rides: completedRides,
                    emptyAsset: 'assets/images/rides-completed.png',
                    emptyTitle: 'No Completed Rides',
                    emptySubtitle: "You haven't completed any rides yet.",
                  ),

                  // 3. Cancelled Tab
                  _buildRideList(
                    title: 'Cancelled Rides',
                    rides: cancelledRides,
                    emptyAsset: 'assets/images/rides-cancelled.png',
                    emptyTitle: 'No Cancelled Rides',
                    emptySubtitle: "You don't have any cancelled rides.",
                  ),
                ],
              ),
            );
          }

          if (state is ProfileError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline_rounded,
                      size: 48,
                      color: Color(0xFFE53935),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Failed to load history',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Color(0xFF0A2540),
                      ),
                    ),

                    const SizedBox(height: 8),
                    Text(
                      state.message,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => context.read<ProfileBloc>().add(
                        LoadRideHistoryEvent(),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildEmptyState({
    required String imagePath,
    required String title,
    required String subtitle,
    bool showBookButton = false,
  }) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 20),
            Image.asset(
              imagePath,
              width: 240,
              height: 200,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) => const Icon(
                Icons.directions_car_filled_rounded,
                size: 100,
                color: Color(0xFF009048),
              ),
            ),
            const SizedBox(height: 32),
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0A2540),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: Color(0xFF64748B)),
            ),
            if (showBookButton) ...[
              const SizedBox(height: 28),
              SizedBox(
                width: 160,
                child: OutlinedButton(
                  onPressed: () => context.go('/home'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(
                      color: Color(0xFF009048),
                      width: 1.5,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Book a Ride',
                    style: TextStyle(
                      color: Color(0xFF009048),
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildRideList({
    required String title,
    required List<Map<String, dynamic>> rides,
    required String emptyAsset,
    required String emptyTitle,
    required String emptySubtitle,
    bool showBookButton = false,
  }) {
    if (rides.isEmpty) {
      return _buildEmptyState(
        imagePath: emptyAsset,
        title: emptyTitle,
        subtitle: emptySubtitle,
        showBookButton: showBookButton,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      itemCount: rides.length,
      itemBuilder: (context, index) {
        final ride = rides[index];
        return _buildRideCard(ride);
      },
    );
  }

  Map<String, String> _parseAddress(String rawAddress) {
    if (rawAddress.isEmpty) return {'title': 'Location', 'subtitle': ''};
    final parts = rawAddress
        .split(',')
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return {'title': rawAddress, 'subtitle': ''};
    if (parts.length == 1) return {'title': parts[0], 'subtitle': ''};
    if (parts.length == 2) return {'title': parts[0], 'subtitle': parts[1]};

    // When 3 or more comma parts exist: first 2 parts in title, remaining in subtitle
    final title = '${parts[0]}, ${parts[1]}';
    final subtitle = parts.sublist(2).join(', ');
    return {'title': title, 'subtitle': subtitle};
  }

  Widget _buildRideCard(Map<String, dynamic> ride) {
    final status = (ride['status'] as String? ?? '').toLowerCase();
    final bool isCancelled = status == 'cancelled';
    final Color statusColor = isCancelled
        ? const Color(0xFFEF4444)
        : const Color(0xFF009048);
    final Color badgeBg = isCancelled
        ? const Color(0xFFFEE2E2)
        : const Color(0xFFDCFCE7);

    // Format Fare Minor units to Major currency units (Full value, not rounded)
    final int estimatedFareMinor = ride['estimatedFareMinor'] as int? ?? 0;
    final int actualFareMinor =
        ride['actualFareMinor'] as int? ?? estimatedFareMinor;
    final double fare = actualFareMinor / 100.0;

    final pickupRaw = ride['pickupAddress'] as String? ??
        ride['pickup_address'] as String? ??
        'Pickup Point';
    final dropRaw = ride['dropAddress'] as String? ??
        ride['drop_address'] as String? ??
        'Drop-off Point';

    final pickupParsed = _parseAddress(pickupRaw);
    final pickupTitle = pickupParsed['title']!;
    final pickupSubtitle = pickupParsed['subtitle']!;

    final dropParsed = _parseAddress(dropRaw);
    final dropTitle = dropParsed['title']!;
    final dropSubtitle = dropParsed['subtitle']!;

    // Format Timestamp
    String formattedTime = 'Recent Trip';
    final requestedAtStr =
        ride['requestedAt'] as String? ?? ride['createdAt'] as String?;
    if (requestedAtStr != null) {
      try {
        final parsedDate = DateTime.parse(requestedAtStr).toLocal();
        formattedTime = DateFormat('dd MMM, hh:mm a').format(parsedDate);
      } catch (_) {}
    }

    // Resolves vehicle type & model name dynamically
    final String? vTypeName = ride['vehicleTypeName']?.toString() ??
        ride['vehicle_type_name']?.toString() ??
        ride['vehicleType']?.toString();
    final String? vModel = ride['vehicleModel']?.toString() ??
        ride['vehicle_model']?.toString();
    final String? vGeneric = ride['vehicle']?.toString();

    // Prefer specific vehicle model name, falling back to type name or generic
    final String vehicleDisplayName = (vModel != null && vModel.trim().isNotEmpty)
        ? vModel.trim()
        : ((vTypeName != null && vTypeName.trim().isNotEmpty)
            ? vTypeName.trim()
            : ((vGeneric != null && vGeneric.trim().isNotEmpty) ? vGeneric.trim() : 'Sedan'));

    // Determine matching Material Icon based on vehicle type / slug / model
    final String typeKey = '${vTypeName ?? ''} ${ride['vehicleTypeSlug'] ?? ''} ${vModel ?? ''} ${vGeneric ?? ''}'.toLowerCase();
    final IconData vehicleIcon;
    if (typeKey.contains('auto') || typeKey.contains('rickshaw')) {
      vehicleIcon = Icons.electric_rickshaw_rounded;
    } else if (typeKey.contains('bike') || typeKey.contains('moto') || typeKey.contains('two')) {
      vehicleIcon = Icons.two_wheeler_rounded;
    } else {
      vehicleIcon = Icons.local_taxi_rounded;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Top Section: Route, Locations, Fare, and Payment Method
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left Side: Route Indicator & Location Text with IntrinsicHeight
              Expanded(
                child: IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Route Dots and Connecting Line with Middle Dot
                      SizedBox(
                        width: 12,
                        child: Column(
                          children: [
                            // Solid Green Circle (Pickup)
                            Container(
                              margin: const EdgeInsets.only(top: 10),
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                color: Color(0xFF009048),
                                shape: BoxShape.circle,
                              ),
                            ),
                            // Auto-expanding Connecting Line with Centered Mini Dot
                            Expanded(
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  Container(
                                    width: 1.5,
                                    color: const Color(0xFFCBD5E1),
                                  ),
                                  Container(
                                    width: 3.5,
                                    height: 3.5,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFFCBD5E1),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // Red Ring with White Center (Drop-off)
                            Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: const Color(0xFFEF4444),
                                  width: 2.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Location Titles and Subtitles
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            // Pickup Location
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  pickupTitle,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0F172A),
                                    height: 1.2,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (pickupSubtitle.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    pickupSubtitle,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w400,
                                      color: Color(0xFF64748B),
                                      height: 1.2,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ],
                            ),

                            const SizedBox(height: 14),

                            // Drop-off Location
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  dropTitle,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0F172A),
                                    height: 1.2,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (dropSubtitle.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    dropSubtitle,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w400,
                                      color: Color(0xFF64748B),
                                      height: 1.2,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(width: 12),

              // Right Side: Fare and Payment Method
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '₹${fare.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF009048),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    (ride['paymentMethod']?.toString() ?? 'Cash').toUpperCase(),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(color: Color(0xFFF1F5F9), height: 1),
          const SizedBox(height: 14),

          // Bottom Section: Time, Vehicle & Status Badge (as requested)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.calendar_today_outlined,
                    size: 15,
                    color: Color(0xFF009048),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    formattedTime,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text('|', style: TextStyle(color: Color(0xFFCBD5E1))),
                  const SizedBox(width: 8),
                  Icon(
                    vehicleIcon,
                    size: 16,
                    color: const Color(0xFF0165B7), // Brand Secondary Blue
                  ),
                  const SizedBox(width: 5),
                  Text(
                    vehicleDisplayName,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w300,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
