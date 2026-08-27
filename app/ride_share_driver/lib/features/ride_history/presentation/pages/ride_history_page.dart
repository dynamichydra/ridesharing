import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../../injection_container.dart' as di;
import '../../../../presentation/screens/dashboard/driver_main_layout.dart';
import '../bloc/ride_history_bloc.dart';

class RideHistoryPage extends StatefulWidget {
  const RideHistoryPage({super.key});

  @override
  State<RideHistoryPage> createState() => _RideHistoryPageState();
}

class _RideHistoryPageState extends State<RideHistoryPage> {
  late final RideHistoryBloc _bloc = di.sl<RideHistoryBloc>();
  final ScrollController _scrollController = ScrollController();

  String _selectedStatusFilter = 'All'; // 'All', 'Completed', 'Cancelled'
  DateTime? _fromDate;
  DateTime? _toDate;
  RangeValues _timeRange = const RangeValues(
    0,
    1440,
  ); // 0 mins (12:00 AM) to 1440 mins (11:59 PM)
  RangeValues _earningsRange = const RangeValues(0, 10000); // ₹0 to ₹10,000+

  @override
  void initState() {
    super.initState();
    _applyFilters();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;
    if (currentScroll >= maxScroll - 250) {
      final currentState = _bloc.state;
      if (currentState is RideHistoryLoaded &&
          currentState.hasMore &&
          !currentState.isLoadingMore) {
        _bloc.add(LoadMoreRideHistory());
      }
    }
  }

  void _applyFilters() {
    double? minEarnings = _earningsRange.start > 0
        ? _earningsRange.start
        : null;
    double? maxEarnings = _earningsRange.end < 10000
        ? _earningsRange.end
        : null;

    _bloc.add(
      LoadRideHistory(
        status: _selectedStatusFilter.toLowerCase(),
        fromDate: _fromDate?.toIso8601String(),
        toDate: _toDate?.toIso8601String(),
        minEarnings: minEarnings,
        maxEarnings: maxEarnings,
      ),
    );
  }

  String _formatTimeFromMinutes(double minutes) {
    int totalMinutes = minutes.toInt();
    if (totalMinutes >= 1439) return '11:59 PM';
    int hours = totalMinutes ~/ 60;
    int mins = totalMinutes % 60;
    final period = hours >= 12 ? 'PM' : 'AM';
    int displayHours = hours % 12;
    if (displayHours == 0) displayHours = 12;
    return '${displayHours.toString().padLeft(2, '0')}:${mins.toString().padLeft(2, '0')} $period';
  }

  String _formatEarningsLabel(double value) {
    if (value >= 10000) return '₹10,000+';
    return '₹${value.toInt()}';
  }

  void _showFilterModal(BuildContext context) {
    String tempStatus = _selectedStatusFilter;
    DateTime? tempFromDate = _fromDate;
    DateTime? tempToDate = _toDate;
    RangeValues tempTimeRange = _timeRange;
    RangeValues tempEarningsRange = _earningsRange;

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
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top Drag Handle
                    Center(
                      child: Container(
                        width: 44,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFCBD5E1),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Header Row: Filters & Reset
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Filters',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        GestureDetector(
                          onTap: () {
                            setModalState(() {
                              tempStatus = 'All';
                              tempFromDate = null;
                              tempToDate = null;
                              tempTimeRange = const RangeValues(0, 1440);
                              tempEarningsRange = const RangeValues(0, 10000);
                            });
                          },
                          child: const Text(
                            'Reset',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF009048),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Section 1: Status
                    const Text(
                      'Status',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: ['All', 'Completed', 'Cancelled'].map((st) {
                        final isSelected = tempStatus == st;
                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: InkWell(
                              onTap: () => setModalState(() => tempStatus = st),
                              borderRadius: BorderRadius.circular(24),
                              child: Container(
                                height: 42,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? Colors.transparent
                                      : const Color(0xFFF3F4F6),
                                  borderRadius: BorderRadius.circular(24),
                                  border: Border.all(
                                    color: isSelected
                                        ? const Color(0xFF009048)
                                        : Colors.transparent,
                                    width: 1.5,
                                  ),
                                ),
                                child: Text(
                                  st,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: isSelected
                                        ? FontWeight.bold
                                        : FontWeight.w500,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 22),

                    // Section 2: Date Range
                    const Text(
                      'Date Range',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // From Date Input Box
                    InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: tempFromDate ?? DateTime.now(),
                          firstDate: DateTime(2023),
                          lastDate: DateTime.now().add(const Duration(days: 1)),
                          builder: (context, child) {
                            return Theme(
                              data: Theme.of(context).copyWith(
                                colorScheme: const ColorScheme.light(
                                  primary: Color(0xFF009048),
                                ),
                              ),
                              child: child!,
                            );
                          },
                        );
                        if (picked != null) {
                          setModalState(() => tempFromDate = picked);
                        }
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'From Date',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  tempFromDate != null
                                      ? DateFormat(
                                          'dd MMM yyyy',
                                        ).format(tempFromDate!)
                                      : 'Select start date',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: tempFromDate != null
                                        ? FontWeight.w600
                                        : FontWeight.normal,
                                    color: tempFromDate != null
                                        ? const Color(0xFF0F172A)
                                        : const Color(0xFF94A3B8),
                                  ),
                                ),
                              ],
                            ),
                            const Icon(
                              Icons.calendar_today_outlined,
                              size: 20,
                              color: Color(0xFF0F172A),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // To Date Input Box
                    InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate:
                              tempToDate ?? tempFromDate ?? DateTime.now(),
                          firstDate: tempFromDate ?? DateTime(2023),
                          lastDate: DateTime.now().add(const Duration(days: 1)),
                          builder: (context, child) {
                            return Theme(
                              data: Theme.of(context).copyWith(
                                colorScheme: const ColorScheme.light(
                                  primary: Color(0xFF009048),
                                ),
                              ),
                              child: child!,
                            );
                          },
                        );
                        if (picked != null) {
                          setModalState(() => tempToDate = picked);
                        }
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'To Date',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  tempToDate != null
                                      ? DateFormat(
                                          'dd MMM yyyy',
                                        ).format(tempToDate!)
                                      : 'Select end date',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: tempToDate != null
                                        ? FontWeight.w600
                                        : FontWeight.normal,
                                    color: tempToDate != null
                                        ? const Color(0xFF0F172A)
                                        : const Color(0xFF94A3B8),
                                  ),
                                ),
                              ],
                            ),
                            const Icon(
                              Icons.calendar_today_outlined,
                              size: 20,
                              color: Color(0xFF0F172A),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Section 3: Time Range
                    const Text(
                      'Time Range',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        activeTrackColor: const Color(0xFF009048),
                        inactiveTrackColor: const Color(0xFFE2E8F0),
                        trackHeight: 3,
                        thumbColor: Colors.white,
                        thumbShape: const RoundSliderThumbShape(
                          enabledThumbRadius: 10,
                          elevation: 2,
                        ),
                        overlayColor: const Color(
                          0xFF009048,
                        ).withValues(alpha: 0.1),
                        rangeThumbShape: const RoundRangeSliderThumbShape(
                          enabledThumbRadius: 10,
                          elevation: 2,
                        ),
                      ),
                      child: RangeSlider(
                        values: tempTimeRange,
                        min: 0,
                        max: 1440,
                        divisions: 48,
                        onChanged: (vals) {
                          setModalState(() => tempTimeRange = vals);
                        },
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _formatTimeFromMinutes(tempTimeRange.start),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            _formatTimeFromMinutes(tempTimeRange.end),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Section 4: Earnings Range
                    const Text(
                      'Earnings Range',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        activeTrackColor: const Color(0xFF009048),
                        inactiveTrackColor: const Color(0xFFE2E8F0),
                        trackHeight: 3,
                        thumbColor: Colors.white,
                        thumbShape: const RoundSliderThumbShape(
                          enabledThumbRadius: 10,
                          elevation: 2,
                        ),
                        overlayColor: const Color(
                          0xFF009048,
                        ).withValues(alpha: 0.1),
                        rangeThumbShape: const RoundRangeSliderThumbShape(
                          enabledThumbRadius: 10,
                          elevation: 2,
                        ),
                      ),
                      child: RangeSlider(
                        values: tempEarningsRange,
                        min: 0,
                        max: 10000,
                        divisions: 100,
                        onChanged: (vals) {
                          setModalState(() => tempEarningsRange = vals);
                        },
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _formatEarningsLabel(tempEarningsRange.start),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            _formatEarningsLabel(tempEarningsRange.end),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Apply Filters Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _selectedStatusFilter = tempStatus;
                            _fromDate = tempFromDate;
                            _toDate = tempToDate;
                            _timeRange = tempTimeRange;
                            _earningsRange = tempEarningsRange;
                          });
                          Navigator.pop(ctx);
                          _applyFilters();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF009048),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                        child: const Text(
                          'Apply Filters',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
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

  Map<String, List<Map<String, dynamic>>> _groupRidesByDate(
    List<Map<String, dynamic>> rides,
  ) {
    final Map<String, List<Map<String, dynamic>>> grouped = {};
    final now = DateTime.now();
    final todayStr = DateFormat('yyyy-MM-dd').format(now);
    final yesterdayStr = DateFormat(
      'yyyy-MM-dd',
    ).format(now.subtract(const Duration(days: 1)));

    for (final ride in rides) {
      final rawDate =
          ride['completedAt'] ?? ride['requestedAt'] ?? ride['date'];
      String key = 'Today';
      if (rawDate != null) {
        try {
          final dt = DateTime.parse(rawDate.toString()).toLocal();
          final formattedDate = DateFormat('yyyy-MM-dd').format(dt);
          if (formattedDate == todayStr) {
            key = 'Today';
          } else if (formattedDate == yesterdayStr) {
            key = 'Yesterday';
          } else {
            key = DateFormat('dd MMMM yyyy').format(dt);
          }
        } catch (_) {
          key = 'Previous Rides';
        }
      }
      grouped.putIfAbsent(key, () => []).add(ride);
    }
    return grouped;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.menu_rounded,
            size: 26,
          ),
          onPressed: () => DriverMainLayout.openDrawer(),
        ),
        title: const Text(
          'Ride History',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(
              Icons.filter_alt_outlined,
              size: 24,
            ),
            onPressed: () => _showFilterModal(context),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // 1. Top Status Segment Pills (All, Completed, Cancelled)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
            child: Row(
              children: ['All', 'Completed', 'Cancelled'].map((tab) {
                final isSelected = _selectedStatusFilter == tab;
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _selectedStatusFilter = tab;
                        });
                        _applyFilters();
                      },
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        height: 40,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? const Color(0xFF009048)
                              : const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Text(
                          tab,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSelected
                                ? FontWeight.bold
                                : FontWeight.w500,
                            color: isSelected
                                ? Colors.white
                                : const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // 2. Rides Grouped List with Scroll Pagination
          Expanded(
            child: BlocBuilder<RideHistoryBloc, RideHistoryState>(
              bloc: _bloc,
              builder: (context, state) {
                if (state is RideHistoryLoading) {
                  return const Center(
                    child: CircularProgressIndicator(color: Color(0xFF009048)),
                  );
                }

                if (state is RideHistoryError) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            size: 48,
                            color: Color(0xFFEF4444),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            state.message,
                            style: const TextStyle(color: Color(0xFF64748B)),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _applyFilters,
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

                if (state is RideHistoryLoaded) {
                  final rides = state.rides;
                  if (rides.isEmpty) {
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(40),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.directions_car_outlined,
                              size: 48,
                              color: Color(0xFFCBD5E1),
                            ),
                            SizedBox(height: 12),
                            Text(
                              'No rides found',
                              style: TextStyle(
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  final groupedRides = _groupRidesByDate(rides);

                  return RefreshIndicator(
                    onRefresh: () async => _applyFilters(),
                    color: const Color(0xFF009048),
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                      itemCount:
                          groupedRides.keys.length +
                          (state.isLoadingMore ? 1 : 0),
                      itemBuilder: (context, groupIndex) {
                        if (groupIndex == groupedRides.keys.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Loading more rides... ',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                                SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Color(0xFF009048),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }

                        final dateHeader = groupedRides.keys.elementAt(
                          groupIndex,
                        );
                        final dateRides = groupedRides[dateHeader]!;

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(
                                bottom: 12,
                                top: 4,
                              ),
                              child: Text(
                                dateHeader,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1E293B),
                                ),
                              ),
                            ),
                            ...dateRides.map(
                              (ride) => _buildRideCard(context, ride),
                            ),
                            const SizedBox(height: 8),
                          ],
                        );
                      },
                    ),
                  );
                }

                return const SizedBox.shrink();
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRideCard(BuildContext context, Map<String, dynamic> ride) {
    final status = (ride['status']?.toString() ?? 'completed').toLowerCase();
    final isCancelled = status == 'cancelled' || ride['isCancelled'] == true;
    final fare = (ride['fare'] as num?)?.toDouble() ?? 0.0;
    final pickupRaw =
        ride['pickupAddress']?.toString() ??
        ride['pickup']?.toString() ??
        'Pickup location';
    final dropRaw =
        ride['dropAddress']?.toString() ??
        ride['drop']?.toString() ??
        'Drop location';

    // Parse main address: first 2 comma parts for title, remaining for subtitle
    final pickupParsed = _parseAddress(pickupRaw);
    final pickupTitle = pickupParsed['title']!;
    final pickupSubtitle = pickupParsed['subtitle']!;

    final dropParsed = _parseAddress(dropRaw);
    final dropTitle = dropParsed['title']!;
    final dropSubtitle = dropParsed['subtitle']!;

    final durationMin =
        (ride['durationMin'] as num?)?.toInt() ??
        (ride['duration'] is num ? (ride['duration'] as num).toInt() : 25);

    // Format pickup and drop-off times
    String pickupTimeStr = '09:40 PM';
    String dropTimeStr = '10:05 PM';

    final rawStarted =
        ride['startedAt'] ?? ride['acceptedAt'] ?? ride['requestedAt'];
    if (rawStarted != null) {
      try {
        final parsedStart = DateTime.parse(rawStarted.toString()).toLocal();
        pickupTimeStr = DateFormat('hh:mm a').format(parsedStart);

        final rawCompleted = ride['completedAt'];
        if (rawCompleted != null) {
          final parsedEnd = DateTime.parse(rawCompleted.toString()).toLocal();
          dropTimeStr = DateFormat('hh:mm a').format(parsedEnd);
        } else {
          dropTimeStr = DateFormat(
            'hh:mm a',
          ).format(parsedStart.add(Duration(minutes: durationMin)));
        }
      } catch (_) {}
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
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
          // Top Section: Route, Locations, Fare, and Status Badge
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

              // Right Side: Fare and Status Badge
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
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: isCancelled
                          ? const Color(0xFFFEE2E2)
                          : const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      isCancelled ? 'Cancelled' : 'Completed',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isCancelled
                            ? const Color(0xFFEF4444)
                            : const Color(0xFF009048),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(color: Color(0xFFF1F5F9), height: 1),
          const SizedBox(height: 14),

          // Bottom Section: 3 Columns with Colored Clock Icons
          Row(
            children: [
              // Pickup Time (Green Clock)
              Expanded(
                child: Row(
                  children: [
                    const Icon(
                      Icons.access_time_rounded,
                      color: Color(0xFF009048),
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Pickup',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w400,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            pickupTimeStr,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              Container(
                height: 28,
                width: 1,
                color: const Color(0xFFF1F5F9),
                margin: const EdgeInsets.symmetric(horizontal: 6),
              ),

              // Drop-off Time (Red Clock)
              Expanded(
                child: Row(
                  children: [
                    const Icon(
                      Icons.access_time_rounded,
                      color: Color(0xFFEF4444),
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Drop-off',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w400,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            dropTimeStr,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              Container(
                height: 28,
                width: 1,
                color: const Color(0xFFF1F5F9),
                margin: const EdgeInsets.symmetric(horizontal: 6),
              ),

              // Time Taken (Dark Clock)
              Expanded(
                child: Row(
                  children: [
                    const Icon(
                      Icons.access_time_rounded,
                      color: Color(0xFF0F172A),
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Time Taken',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w400,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$durationMin min',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
