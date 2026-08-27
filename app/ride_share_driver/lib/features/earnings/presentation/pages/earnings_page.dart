import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../../../presentation/screens/dashboard/driver_main_layout.dart';
import '../../data/datasources/earnings_remote_datasource.dart';
import '../../data/models/earnings_model.dart';

class EarningsPage extends StatefulWidget {
  const EarningsPage({super.key});

  @override
  State<EarningsPage> createState() => _EarningsPageState();
}

class _EarningsPageState extends State<EarningsPage> {
  EarningsPeriod _selectedPeriod = EarningsPeriod.daily;
  late final EarningsRemoteDataSource _dataSource;
  bool _isLoading = false;

  final Map<EarningsPeriod, EarningsDataModel> _periodData = {
    EarningsPeriod.daily: EarningsDataModel.empty(period: EarningsPeriod.daily, listTitle: 'Last 7 Days'),
    EarningsPeriod.weekly: EarningsDataModel.empty(period: EarningsPeriod.weekly, listTitle: 'This Week'),
    EarningsPeriod.monthly: EarningsDataModel.empty(period: EarningsPeriod.monthly, listTitle: 'This Month'),
  };

  @override
  void initState() {
    super.initState();
    _dataSource = sl<EarningsRemoteDataSource>();
    _fetchEarnings();
  }

  Future<void> _fetchEarnings() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final periodStr = _selectedPeriod == EarningsPeriod.daily
          ? 'daily'
          : _selectedPeriod == EarningsPeriod.weekly
              ? 'weekly'
              : 'monthly';

      final liveData = await _dataSource.getEarnings(period: periodStr);

      if (mounted) {
        setState(() {
          _periodData[_selectedPeriod] = liveData;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _onPeriodChanged(EarningsPeriod period) {
    if (_selectedPeriod == period) return;
    setState(() => _selectedPeriod = period);
    _fetchEarnings();
  }

  @override
  Widget build(BuildContext context) {
    final data = _periodData[_selectedPeriod]!;

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: Color(0xFF021B47), size: 26),
          onPressed: () => DriverMainLayout.openDrawer(),
        ),
        centerTitle: true,
        title: const Text(
          'Earnings',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchEarnings,
        color: const Color(0xFF009048),
        backgroundColor: Colors.white,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Top Period Tabs (Underlined Bar Style)
              _buildPeriodTabs(),

              const SizedBox(height: 18),

              // Loading Indicator Bar (Subtle)
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: LinearProgressIndicator(
                    minHeight: 2.5,
                    backgroundColor: Color(0xFFE2E8F0),
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF009048)),
                  ),
                ),

              // 2. Total Earnings Hero Card
              _buildTotalEarningsCard(data),

              const SizedBox(height: 16),

              // 3. Payment Breakdown Card
              _buildPaymentBreakdownCard(data),

              const SizedBox(height: 16),

              // 4. Earnings Breakdown Card
              _buildEarningsBreakdownCard(data),

              const SizedBox(height: 20),

              // 5. History Section Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      data.listTitle,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    GestureDetector(
                      onTap: _fetchEarnings,
                      child: const Text(
                        'Refresh',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF009048),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),

              // 6. History List Card
              _buildHistoryListCard(data.historyItems, _selectedPeriod == EarningsPeriod.daily),

              const SizedBox(height: 28),
            ],
          ),
        ),
      ),
    );
  }

  // ── Top Period Selector Tabs ───────────────────────────────────────────────
  Widget _buildPeriodTabs() {
    return Container(
      color: Colors.transparent,
      child: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              height: 1.5,
              color: const Color(0xFFE2E8F0),
            ),
          ),
          Row(
            children: [
              Expanded(child: _buildTabItem('Daily', EarningsPeriod.daily)),
              Expanded(child: _buildTabItem('Weekly', EarningsPeriod.weekly)),
              Expanded(child: _buildTabItem('Monthly', EarningsPeriod.monthly)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTabItem(String title, EarningsPeriod period) {
    final isSelected = _selectedPeriod == period;
    return GestureDetector(
      onTap: () => _onPeriodChanged(period),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              title,
              style: TextStyle(
                fontSize: 15,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? const Color(0xFF009048) : const Color(0xFF334155),
              ),
            ),
          ),
          Container(
            height: 3,
            width: double.infinity,
            decoration: BoxDecoration(
              color: isSelected ? const Color(0xFF009048) : Colors.transparent,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ],
      ),
    );
  }

  // ── Total Earnings Hero Card ───────────────────────────────────────────────
  Widget _buildTotalEarningsCard(EarningsDataModel data) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Top Split Section
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Left Column: Total Earnings + Amount + Growth Tag
                Expanded(
                  flex: 11,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'Total Earnings',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        data.totalEarnings,
                        style: const TextStyle(
                          fontSize: 25,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Builder(
                        builder: (context) {
                          final isNegativeGrowth = data.growthPercent.startsWith('-');
                          final displayGrowth = isNegativeGrowth
                              ? data.growthPercent.replaceFirst('-', '')
                              : data.growthPercent;
                          final trendColor = isNegativeGrowth
                              ? const Color(0xFFEF4444)
                              : const Color(0xFF009048);
                          final trendIcon = isNegativeGrowth
                              ? Icons.trending_down_rounded
                              : Icons.trending_up_rounded;

                          return Row(
                            children: [
                              Icon(
                                trendIcon,
                                color: trendColor,
                                size: 16,
                              ),
                              const SizedBox(width: 3),
                              Text(
                                displayGrowth,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: trendColor,
                                ),
                              ),
                              Text(
                                ' ${data.growthPeriod}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                ),

                // Vertical Divider Line
                Container(
                  width: 1,
                  margin: const EdgeInsets.symmetric(horizontal: 12),
                  color: const Color(0xFFF1F5F9),
                ),

                // Right Column: Cash Collected & Incentives
                Expanded(
                  flex: 10,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Cash Collected
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: const Icon(
                              Icons.account_balance_wallet_outlined,
                              color: Color(0xFF009048),
                              size: 16,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Cash Collected',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF64748B),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  data.cashCollected,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Incentives
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: const Icon(
                              Icons.card_giftcard_rounded,
                              color: Color(0xFF009048),
                              size: 16,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Incentives',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF64748B),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  data.incentivesAmount,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 12),

          // Bottom Row: Trips | Online Hours | Avg. Per Trip (Centered & Compact)
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Trips
              Expanded(
                child: _buildMetricColumn(
                  icon: const Icon(Icons.bar_chart_rounded, color: Color(0xFF009048), size: 16),
                  label: 'Trips',
                  value: '${data.trips}',
                ),
              ),

              Container(
                width: 1,
                height: 30,
                color: const Color(0xFFF1F5F9),
                margin: const EdgeInsets.symmetric(horizontal: 4),
              ),

              // Online Hours
              Expanded(
                child: _buildMetricColumn(
                  icon: const Icon(Icons.access_time_rounded, color: Color(0xFF009048), size: 15),
                  label: 'Duration',
                  value: data.onlineHours,
                ),
              ),

              Container(
                width: 1,
                height: 30,
                color: const Color(0xFFF1F5F9),
                margin: const EdgeInsets.symmetric(horizontal: 4),
              ),

              // Avg. Per Trip
              Expanded(
                child: _buildMetricColumn(
                  icon: const Text(
                    '₹',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF009048),
                    ),
                  ),
                  label: 'Avg. Per Trip',
                  value: data.avgPerTrip,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricColumn({
    required Widget icon,
    required String label,
    required String value,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            icon,
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 3),
        Text(
          value,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0F172A),
          ),
          maxLines: 1,
        ),
      ],
    );
  }

  // ── Payment Breakdown Card ─────────────────────────────────────────────────
  Widget _buildPaymentBreakdownCard(EarningsDataModel data) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Payment Breakdown',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 16),

          // Cash Received Row
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.account_balance_wallet_rounded, color: Color(0xFF009048), size: 16),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Cash Received',
                  style: TextStyle(fontSize: 13, color: Color(0xFF0F172A), fontWeight: FontWeight.w500),
                ),
              ),
              Text(
                '${data.cashPercent.toStringAsFixed(1)}%',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF009048),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Wallet Payments Row
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.account_balance_wallet_rounded, color: Color(0xFF2563EB), size: 16),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Wallet Payments',
                  style: TextStyle(fontSize: 13, color: Color(0xFF0F172A), fontWeight: FontWeight.w500),
                ),
              ),
              Text(
                '${data.walletPercent.toStringAsFixed(1)}%',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF2563EB),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Dual-Color Horizontal Ratio Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: SizedBox(
              height: 6,
              child: Row(
                children: [
                  Expanded(
                    flex: (data.cashPercent * 10).round().clamp(1, 999),
                    child: Container(color: const Color(0xFF009048)),
                  ),
                  const SizedBox(width: 2),
                  Expanded(
                    flex: (data.walletPercent * 10).round().clamp(1, 999),
                    child: Container(color: const Color(0xFF2563EB)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Earnings Breakdown Card ───────────────────────────────────────────────
  Widget _buildEarningsBreakdownCard(EarningsDataModel data) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Earnings Breakdown',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 16),

          _buildBreakdownLine('Fare Amount', data.fareAmount),
          const SizedBox(height: 10),
          _buildBreakdownLine('Incentives', data.incentives),
          const SizedBox(height: 10),
          _buildBreakdownLine('Other Earnings', data.otherEarnings),

          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 12),

          _buildBreakdownLine('Gross Earnings', data.grossEarnings, valueColor: const Color(0xFF009048), isBold: true),
          const SizedBox(height: 10),
          _buildBreakdownLine('Deductions', data.deductions, valueColor: const Color(0xFFEF4444), isBold: true),

          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 12),

          _buildBreakdownLine('Net Earnings', data.netEarnings, valueColor: const Color(0xFF009048), isBold: true, isLarge: true),
        ],
      ),
    );
  }

  Widget _buildBreakdownLine(
    String label,
    String value, {
    Color? valueColor,
    bool isBold = false,
    bool isLarge = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isLarge ? 14 : 13,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
            color: const Color(0xFF0F172A),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isLarge ? 15 : 13,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            color: valueColor ?? const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  // ── History List Card ──────────────────────────────────────────────────────
  Widget _buildHistoryListCard(List<DayEarningItem> items, bool isDaily) {
    if (items.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
        ),
        child: const Center(
          child: Text(
            'No trips in this period yet',
            style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: items.length,
        separatorBuilder: (_, __) => const Divider(height: 1, thickness: 1, color: Color(0xFFF8FAFC)),
        itemBuilder: (context, index) {
          final item = items[index];

          if (isDaily) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: item.isToday ? const Color(0xFF009048) : const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.dateSubtitle != null
                              ? '${item.dateSubtitle}   •   ${item.trips} trips'
                              : '${item.trips} trips',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    item.amount,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF009048),
                    ),
                  ),
                ],
              ),
            );
          } else {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: Text(
                      item.title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 2,
                    child: Text(
                      '${item.trips} trips',
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),
                  Text(
                    item.amount,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF009048),
                    ),
                  ),
                ],
              ),
            );
          }
        },
      ),
    );
  }
}
