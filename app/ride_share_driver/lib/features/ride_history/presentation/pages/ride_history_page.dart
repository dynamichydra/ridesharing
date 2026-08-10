import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../style/appcolors.dart';
import '../../../../injection_container.dart' as di;
import '../bloc/ride_history_bloc.dart';

class RideHistoryPage extends StatefulWidget {
  const RideHistoryPage({super.key});

  @override
  State<RideHistoryPage> createState() => _RideHistoryPageState();
}

class _RideHistoryPageState extends State<RideHistoryPage> {
  late final RideHistoryBloc _bloc = di.sl<RideHistoryBloc>();
  final ScrollController _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(() {
      if (_scrollCtrl.position.pixels > _scrollCtrl.position.maxScrollExtent - 120) {
        _bloc.add(LoadMoreRideHistory());
      }
    });
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    _bloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _bloc..add(LoadRideHistory()),
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          title: const Text('Ride History', style: TextStyle(fontWeight: FontWeight.bold)),
          backgroundColor: Colors.white,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1),
            child: Container(color: AppColors.border.withOpacity(0.4), height: 1),
          ),
        ),
        body: BlocBuilder<RideHistoryBloc, RideHistoryState>(
          builder: (context, state) {
            if (state is RideHistoryLoading || state is RideHistoryInitial) {
              return const Center(child: CircularProgressIndicator());
            }
            if (state is RideHistoryError) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                    const SizedBox(height: 12),
                    Text(state.message, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => _bloc.add(LoadRideHistory()),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              );
            }

            if (state is RideHistoryLoaded) {
              final rides = state.rides;
              if (rides.isEmpty) {
                return const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.directions_car_outlined, size: 64, color: AppColors.textSecondary),
                      SizedBox(height: 16),
                      Text('No rides yet', style: TextStyle(fontSize: 16, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                      SizedBox(height: 4),
                      Text('Your completed rides will appear here', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ],
                  ),
                );
              }

              return RefreshIndicator(
                onRefresh: () async {
                  _bloc.add(LoadRideHistory());
                },
                child: ListView.builder(
                  controller: _scrollCtrl,
                  padding: const EdgeInsets.all(16),
                  itemCount: rides.length + (state.isLoadingMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == rides.length) {
                      return const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()));
                    }
                    return _buildRideCard(rides[index]);
                  },
                ),
              );
            }

            return const SizedBox();
          },
        ),
      ),
    );
  }

  Widget _buildRideCard(Map<String, dynamic> ride) {
    final status = ride['status'] as String? ?? 'unknown';
    final pickupAddress = ride['pickupAddress'] as String? ?? 'Pickup location';
    final dropAddress = ride['dropAddress'] as String? ?? 'Drop location';
    final fareMinor = ride['finalFareMinor'] ?? ride['estimatedFareMinor'];
    final currency = ride['currencyCode'] as String? ?? '';
    final distanceKm = double.tryParse(ride['distanceKm']?.toString() ?? '');
    final createdAt = ride['createdAt'] as String?;

    final statusInfo = _statusInfo(status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.5)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 4))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Header row: date + status badge
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(
              createdAt != null ? _formatDate(createdAt) : '—',
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: statusInfo.bg,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(statusInfo.label, style: TextStyle(color: statusInfo.color, fontSize: 10, fontWeight: FontWeight.w700)),
            ),
          ]),
          const SizedBox(height: 12),

          // Route display
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Column(children: [
              const Icon(Icons.circle, size: 10, color: AppColors.primary),
              Container(width: 2, height: 24, color: AppColors.border.withOpacity(0.4)),
              const Icon(Icons.location_on, size: 14, color: AppColors.error),
            ]),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(pickupAddress, style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w500), maxLines: 1, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 16),
              Text(dropAddress, style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w500), maxLines: 1, overflow: TextOverflow.ellipsis),
            ])),
          ]),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),

          // Bottom: fare + distance
          Row(children: [
            if (fareMinor != null) ...[
              Icon(Icons.payments_rounded, size: 15, color: AppColors.primary),
              const SizedBox(width: 4),
              Text(
                '$currency ${(fareMinor / 100.0).toStringAsFixed(2)}',
                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(width: 16),
            ],
            if (distanceKm != null) ...[
              const Icon(Icons.route_rounded, size: 15, color: AppColors.textSecondary),
              const SizedBox(width: 4),
              Text('${distanceKm.toStringAsFixed(1)} km', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            ],
          ]),
        ]),
      ),
    );
  }

  ({String label, Color color, Color bg}) _statusInfo(String status) {
    return switch (status) {
      'completed' => (label: 'Completed', color: const Color(0xFF059669), bg: const Color(0xFFD1FAE5)),
      'cancelled' => (label: 'Cancelled', color: const Color(0xFFDC2626), bg: const Color(0xFFFEE2E2)),
      'accepted' => (label: 'Accepted', color: const Color(0xFF2563EB), bg: const Color(0xFFDBEAFE)),
      'started' => (label: 'In Progress', color: const Color(0xFFD97706), bg: const Color(0xFFFEF3C7)),
      _ => (label: status, color: AppColors.textSecondary, bg: const Color(0xFFF1F5F9)),
    };
  }

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${dt.day} ${months[dt.month - 1]}, ${dt.year} • ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}
