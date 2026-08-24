import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../injection_container.dart' as di;
import '../bloc/ride_history_bloc.dart';
import '../../../../presentation/screens/dashboard/driver_main_layout.dart';

class RideHistoryPage extends StatefulWidget {
  const RideHistoryPage({super.key});

  @override
  State<RideHistoryPage> createState() => _RideHistoryPageState();
}

class _RideHistoryPageState extends State<RideHistoryPage> {
  late final RideHistoryBloc _bloc = di.sl<RideHistoryBloc>();
  String _selectedStatusFilter = 'All'; // 'All', 'Completed', 'Cancelled'
  String _selectedEarningsRange = 'All'; // 'All', '₹0 - ₹500', '₹500 - ₹1500', '₹1500+'
  DateTimeRange? _selectedDateRange;

  // Mock list of rides matching the design mockup for display
  final List<Map<String, dynamic>> _todayRides = [
    {
      'time': '07:45 AM',
      'date': '18 May 2025, 07:45 AM',
      'status': 'Completed',
      'pickup': 'Koramangala',
      'drop': 'Electronic City',
      'vehicle': 'Ryva Cab',
      'distance': '6.2 km',
      'duration': '18 min',
      'fare': 125.0,
      'isCancelled': false,
    },
    {
      'time': '06:30 AM',
      'date': '18 May 2025, 06:30 AM',
      'status': 'Completed',
      'pickup': 'Indiranagar',
      'drop': 'MG Road',
      'vehicle': 'Ryva Auto',
      'distance': '4.1 km',
      'duration': '12 min',
      'fare': 90.0,
      'isCancelled': false,
    },
  ];

  final List<Map<String, dynamic>> _yesterdayRides = [
    {
      'time': '10:15 PM',
      'date': '17 May 2025, 10:15 PM',
      'status': 'Completed',
      'pickup': 'HSR Layout',
      'drop': 'BTM Layout',
      'vehicle': 'Ryva Cab',
      'distance': '5.0 km',
      'duration': '15 min',
      'fare': 110.0,
      'isCancelled': false,
    },
    {
      'time': '08:40 PM',
      'date': '17 May 2025, 08:40 PM',
      'status': 'Cancelled',
      'pickup': 'Marathahalli',
      'drop': 'Whitefield',
      'vehicle': 'Ryva Cab',
      'distance': '7.8 km',
      'duration': '22 min',
      'fare': 0.0,
      'isCancelled': true,
    },
  ];

  @override
  void initState() {
    super.initState();
    _bloc.add(LoadRideHistory());
  }

  @override
  void dispose() {
    _bloc.close();
    super.dispose();
  }

  void _showFilterModal(BuildContext context) {
    String tempStatus = _selectedStatusFilter;
    String tempEarnings = _selectedEarningsRange;
    DateTimeRange? tempRange = _selectedDateRange;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: Color(0xFF021B47)),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                      const Text(
                        'Filters',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF021B47),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          setModalState(() {
                            tempStatus = 'All';
                            tempEarnings = 'All';
                            tempRange = null;
                          });
                        },
                        child: const Text('Reset', style: TextStyle(color: Color(0xFF009048), fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Section 1: Status
                  const Text('Status', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                  const SizedBox(height: 10),
                  Row(
                    children: ['All', 'Completed', 'Cancelled'].map((st) {
                      final isSelected = tempStatus == st;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(st),
                          selected: isSelected,
                          onSelected: (_) => setModalState(() => tempStatus = st),
                          selectedColor: const Color(0xFF009048),
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : const Color(0xFF021B47),
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          ),
                          backgroundColor: const Color(0xFFF1F5F9),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),

                  // Section 2: Date Range
                  const Text('Date Range', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                  const SizedBox(height: 10),
                  InkWell(
                    onTap: () async {
                      final picked = await showDateRangePicker(
                        context: context,
                        firstDate: DateTime(2023),
                        lastDate: DateTime.now().add(const Duration(days: 1)),
                        initialDateRange: tempRange,
                      );
                      if (picked != null) {
                        setModalState(() => tempRange = picked);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            tempRange != null
                                ? '${tempRange!.start.day} May 2025'
                                : '18 May 2025',
                            style: const TextStyle(fontSize: 13, color: Color(0xFF021B47)),
                          ),
                          const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFF8A94A6)),
                          const Text('to', style: TextStyle(fontSize: 12, color: Color(0xFF8A94A6))),
                          Text(
                            tempRange != null
                                ? '${tempRange!.end.day} May 2025'
                                : '18 May 2025',
                            style: const TextStyle(fontSize: 13, color: Color(0xFF021B47)),
                          ),
                          const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFF8A94A6)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Section 3: Earnings Range
                  const Text('Earnings Range', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: ['All', '₹0 - ₹500', '₹500 - ₹1500', '₹1500+'].map((r) {
                      final isSelected = tempEarnings == r;
                      return ChoiceChip(
                        label: Text(r),
                        selected: isSelected,
                        onSelected: (_) => setModalState(() => tempEarnings = r),
                        selectedColor: const Color(0xFF009048),
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : const Color(0xFF021B47),
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        ),
                        backgroundColor: const Color(0xFFF1F5F9),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),

                  // Apply Filters Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _selectedStatusFilter = tempStatus;
                          _selectedEarningsRange = tempEarnings;
                          _selectedDateRange = tempRange;
                        });
                        Navigator.pop(ctx);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: const Text('Apply Filters', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: Color(0xFF021B47), size: 26),
          onPressed: () => DriverMainLayout.openDrawer(),
        ),
        title: const Text(
          'Rides History',
          style: TextStyle(
            color: Color(0xFF021B47),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_rounded, color: Color(0xFF021B47), size: 24),
            onPressed: () => _showFilterModal(context),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // 1. Status Filter Pills: All, Completed, Cancelled
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: ['All', 'Completed', 'Cancelled'].map((tab) {
                final isSelected = _selectedStatusFilter == tab;
                return Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _selectedStatusFilter = tab;
                      });
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF009048) : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF009048) : const Color(0xFFE2E7E9),
                        ),
                      ),
                      child: Text(
                        tab,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          color: isSelected ? Colors.white : const Color(0xFF535E79),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),

          // 2. Rides Grouped by Date
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_filterRides(_todayRides).isNotEmpty) ...[
                    const Text(
                      'Today',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                    ),
                    const SizedBox(height: 10),
                    ..._filterRides(_todayRides).map((ride) => _buildRideCard(context, ride)),
                    const SizedBox(height: 16),
                  ],

                  if (_filterRides(_yesterdayRides).isNotEmpty) ...[
                    const Text(
                      'Yesterday',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                    ),
                    const SizedBox(height: 10),
                    ..._filterRides(_yesterdayRides).map((ride) => _buildRideCard(context, ride)),
                    const SizedBox(height: 16),
                  ],

                  if (_filterRides(_todayRides).isEmpty && _filterRides(_yesterdayRides).isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          children: const [
                            Icon(Icons.directions_car_outlined, size: 48, color: Color(0xFFCBD5E1)),
                            SizedBox(height: 12),
                            Text('No rides match filters', style: TextStyle(color: Color(0xFF8A94A6), fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> _filterRides(List<Map<String, dynamic>> list) {
    return list.where((r) {
      if (_selectedStatusFilter == 'Completed' && r['status'] != 'Completed') return false;
      if (_selectedStatusFilter == 'Cancelled' && r['status'] != 'Cancelled') return false;
      return true;
    }).toList();
  }

  Widget _buildRideCard(BuildContext context, Map<String, dynamic> ride) {
    final isCancelled = ride['isCancelled'] == true;
    final fare = (ride['fare'] as num).toDouble();

    return InkWell(
      onTap: () {
        context.push('/ride-details', extra: ride);
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E7E9)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  ride['time'] as String,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF8A94A6)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isCancelled ? const Color(0xFFFDE8E8) : const Color(0xFFE6F4EA),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    ride['status'] as String,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isCancelled ? const Color(0xFFE53935) : const Color(0xFF009048),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Pickup & Drop
            Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.circle, color: Color(0xFF009048), size: 8),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              ride['pickup'] as String,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF021B47)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.circle, color: Color(0xFFE53935), size: 8),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              ride['drop'] as String,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF021B47)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '₹${fare.toStringAsFixed(0)}',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: isCancelled ? const Color(0xFF8A94A6) : const Color(0xFF009048),
                      ),
                    ),
                    if (!isCancelled)
                      const Text(
                        'Earned',
                        style: TextStyle(fontSize: 10, color: Color(0xFF8A94A6)),
                      ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(),
            const SizedBox(height: 6),

            Row(
              children: [
                const Icon(Icons.directions_car_filled_rounded, size: 14, color: Color(0xFF021B47)),
                const SizedBox(width: 6),
                Text(
                  ride['vehicle'] as String,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                ),
                const SizedBox(width: 12),
                Text(
                  '${ride['distance']} • ${ride['duration']}',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
