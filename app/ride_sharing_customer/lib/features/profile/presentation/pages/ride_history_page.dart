import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/profile_bloc.dart';

class RideHistoryPage extends StatefulWidget {
  const RideHistoryPage({super.key});

  @override
  State<RideHistoryPage> createState() => _RideHistoryPageState();
}

class _RideHistoryPageState extends State<RideHistoryPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<Map<String, dynamic>> _completedRides = [
    {
      'pickup': 'Koramangala, Bengaluru',
      'destination': 'Electronic City, Bengaluru',
      'fare': 125,
      'payment_method': 'Cash',
      'time': 'Today, 10:30 AM',
      'vehicle': 'Mini',
      'status': 'Completed',
    },
    {
      'pickup': 'Indiranagar, Bengaluru',
      'destination': 'MG Road, Bengaluru',
      'fare': 110,
      'payment_method': 'UPI',
      'time': 'Yesterday, 07:45 PM',
      'vehicle': 'Sedan',
      'status': 'Completed',
    },
    {
      'pickup': 'Whitefield, Bengaluru',
      'destination': 'Marathahalli, Bengaluru',
      'fare': 90,
      'payment_method': 'Cash',
      'time': '15 May, 09:15 AM',
      'vehicle': 'Mini',
      'status': 'Completed',
    },
    {
      'pickup': 'HSR Layout, Bengaluru',
      'destination': 'Jayanagar, Bengaluru',
      'fare': 130,
      'payment_method': 'UPI',
      'time': '12 May, 06:20 PM',
      'vehicle': 'Sedan',
      'status': 'Completed',
    },
    {
      'pickup': 'Electronic City, Bengaluru',
      'destination': 'Koramangala, Bengaluru',
      'fare': 115,
      'payment_method': 'Cash',
      'time': '10 May, 11:30 AM',
      'vehicle': 'Mini',
      'status': 'Completed',
    },
  ];

  final List<Map<String, dynamic>> _cancelledRides = [
    {
      'pickup': 'HSR Layout, Bengaluru',
      'destination': 'Yelahanka, Bengaluru',
      'fare': 120,
      'payment_method': 'Cash',
      'time': '12 May, 08:20 AM',
      'vehicle': 'Mini',
      'status': 'Cancelled',
    },
    {
      'pickup': 'Bellandur, Bengaluru',
      'destination': 'Koramangala, Bengaluru',
      'fare': 95,
      'payment_method': 'UPI',
      'time': '10 May, 06:10 PM',
      'vehicle': 'Sedan',
      'status': 'Cancelled',
    },
    {
      'pickup': 'Whitefield, Bengaluru',
      'destination': 'Indiranagar, Bengaluru',
      'fare': 105,
      'payment_method': 'Cash',
      'time': '08 May, 09:40 AM',
      'vehicle': 'Mini',
      'status': 'Cancelled',
    },
    {
      'pickup': 'Jayanagar, Bengaluru',
      'destination': 'MG Road, Bengaluru',
      'fare': 85,
      'payment_method': 'UPI',
      'time': '05 May, 07:15 PM',
      'vehicle': 'Sedan',
      'status': 'Cancelled',
    },
  ];

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
    final activeColor = isCancelledTab ? const Color(0xFFE53935) : const Color(0xFF009048);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, size: 26, color: Color(0xFF0A2540)),
          onPressed: () {
            Scaffold.of(context).openDrawer();
          },
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
            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 15),
            unselectedLabelColor: const Color(0xFF64748B),
            tabs: [
              Tab(
                child: Text(
                  'Upcoming',
                  style: TextStyle(
                    color: _tabController.index == 0 ? const Color(0xFF009048) : const Color(0xFF64748B),
                  ),
                ),
              ),
              Tab(
                child: Text(
                  'Completed',
                  style: TextStyle(
                    color: _tabController.index == 1 ? const Color(0xFF009048) : const Color(0xFF64748B),
                  ),
                ),
              ),
              Tab(
                child: Text(
                  'Cancelled',
                  style: TextStyle(
                    color: _tabController.index == 2 ? const Color(0xFFE53935) : const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      body: BlocBuilder<ProfileBloc, ProfileState>(
        builder: (context, state) {
          return TabBarView(
            controller: _tabController,
            children: [
              // 1. Upcoming Tab (No Data / Empty State with asset image)
              _buildEmptyState(
                imagePath: 'assets/images/rides-upcoming.png',
                title: 'No Upcoming Rides',
                subtitle: "You don't have any upcoming rides.",
                showBookButton: true,
              ),

              // 2. Completed Tab (Populated List)
              _buildRideList(
                title: 'Completed Rides',
                rides: _completedRides,
                emptyAsset: 'assets/images/rides-completed.png',
                emptyTitle: 'No Completed Rides',
                emptySubtitle: "You haven't completed any rides yet.",
              ),

              // 3. Cancelled Tab (Populated List)
              _buildRideList(
                title: 'Cancelled Rides',
                rides: _cancelledRides,
                emptyAsset: 'assets/images/rides-cancelled.png',
                emptyTitle: 'No Cancelled Rides',
                emptySubtitle: "You don't have any cancelled rides.",
              ),
            ],
          );
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
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
              ),
            ),
            if (showBookButton) ...[
              const SizedBox(height: 28),
              SizedBox(
                width: 160,
                // height: 44,
                child: OutlinedButton(
                  onPressed: () => context.go('/home'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF009048), width: 1.5),
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
  }) {
    if (rides.isEmpty) {
      return _buildEmptyState(
        imagePath: emptyAsset,
        title: emptyTitle,
        subtitle: emptySubtitle,
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0A2540),
            ),
          ),
          const SizedBox(height: 14),
          ...rides.map((ride) => _buildRideCard(ride)),
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: () {},
              child: const Text(
                'View More',
                style: TextStyle(
                  color: Color(0xFF009048),
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildRideCard(Map<String, dynamic> ride) {
    final bool isCancelled = ride['status'] == 'Cancelled';
    final Color statusColor = isCancelled ? const Color(0xFFE53935) : const Color(0xFF009048);
    final Color badgeBg = isCancelled ? const Color(0xFFFFEBEE) : const Color(0xFFE6F4EA);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Location Line indicator
              Padding(
                padding: const EdgeInsets.only(top: 4, right: 12),
                child: Column(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isCancelled ? const Color(0xFFE53935) : const Color(0xFF009048),
                      ),
                      child: Center(
                        child: Container(
                          width: 4,
                          height: 4,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    Container(
                      width: 1.5,
                      height: 26,
                      color: const Color(0xFFCBD5E1),
                    ),
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isCancelled ? const Color(0xFFE53935) : const Color(0xFFE53935),
                          width: 2,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Pickup & Destination text
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ride['pickup'] as String,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0A2540),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      ride['destination'] as String,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0A2540),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              // Fare & Payment Method
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '₹${ride['fare']}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0A2540),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    ride['payment_method'] as String,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Time, Vehicle & Status Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.calendar_today_outlined, size: 14, color: Color(0xFF64748B)),
                  const SizedBox(width: 6),
                  Text(
                    ride['time'] as String,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text('|', style: TextStyle(color: Color(0xFFCBD5E1))),
                  const SizedBox(width: 8),
                  const Icon(Icons.directions_car_rounded, size: 14, color: Color(0xFF64748B)),
                  const SizedBox(width: 4),
                  Text(
                    ride['vehicle'] as String,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  ride['status'] as String,
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
