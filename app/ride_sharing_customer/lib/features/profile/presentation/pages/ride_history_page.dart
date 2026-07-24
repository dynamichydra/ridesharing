import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/empty_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../bloc/profile_bloc.dart';

class RideHistoryPage extends StatefulWidget {
  const RideHistoryPage({super.key});

  @override
  State<RideHistoryPage> createState() => _RideHistoryPageState();
}

class _RideHistoryPageState extends State<RideHistoryPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    context.read<ProfileBloc>().add(LoadRideHistoryEvent());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'My Rides',
          style: TextStyle(color: Color(0xFF021B47), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF01A34D),
          indicatorSize: TabBarIndicatorSize.tab,
          labelColor: const Color(0xFF01A34D),
          unselectedLabelColor: const Color(0xFF8A94A6),
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
          tabs: const [
            Tab(text: 'Upcoming'),
            Tab(text: 'History'),
          ],
        ),
      ),
      body: BlocBuilder<ProfileBloc, ProfileState>(
        builder: (context, state) {
          if (state is ProfileLoading) {
            return const LoadingView();
          }

          if (state is ProfileLoaded) {
            final rides = state.rideHistory;

            return TabBarView(
              controller: _tabController,
              children: [
                // 1. Upcoming list (Empty state mockup)
                const EmptyView(
                  title: 'No Upcoming Rides',
                  message: 'Your scheduled rides will appear here.',
                  icon: Icons.calendar_today_rounded,
                ),

                // 2. History list
                rides.isEmpty
                    ? const EmptyView(
                        title: 'No Past Rides',
                        message: 'Your completed rides will appear here.',
                        icon: Icons.directions_car_rounded,
                      )
                    : ListView.builder(
                        itemCount: rides.length,
                        padding: const EdgeInsets.all(16),
                        itemBuilder: (context, index) {
                          final ride = rides[index];
                          final status = ride['status'] as String;
                          final isCompleted = status == 'completed';

                          return Container(
                            margin: const EdgeInsets.symmetric(vertical: 8),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E7E9)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Locations Pins
                                Row(
                                  children: [
                                    Column(
                                      children: [
                                        const Icon(Icons.circle, color: Color(0xFF01A34D), size: 10),
                                        Container(height: 18, width: 1, color: Colors.grey.shade300),
                                        const Icon(Icons.location_on_rounded, color: Color(0xFFE53935), size: 12),
                                      ],
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            ride['pickup_name'] != null ? ride['pickup_name'] as String : 'Kormangala, Bengaluru',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                                          ),
                                          const SizedBox(height: 12),
                                          Text(
                                            ride['destination_name'] as String,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          '₹${(ride['fare'] as num).toDouble().toStringAsFixed(0)}',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF021B47)),
                                        ),
                                        const SizedBox(height: 4),
                                        const Text(
                                          'Cash',
                                          style: TextStyle(color: Color(0xFF8A94A6), fontSize: 11),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const Divider(height: 24),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Today, 10:30 AM',
                                      style: TextStyle(fontSize: 12, color: Color(0xFF8A94A6)),
                                    ),
                                    Text(
                                      isCompleted ? 'Completed' : 'Cancelled',
                                      style: TextStyle(
                                        color: isCompleted ? const Color(0xFF01A34D) : const Color(0xFFE53935),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ],
            );
          }

          return const Center(child: CircularProgressIndicator());
        },
      ),
    );
  }
}
