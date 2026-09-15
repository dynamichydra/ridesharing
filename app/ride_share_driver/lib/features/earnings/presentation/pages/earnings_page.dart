import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../injection_container.dart';
import '../../../../presentation/screens/dashboard/driver_main_layout.dart';
import '../../../../style/appcolors.dart';
import '../../data/datasources/earnings_remote_datasource.dart';
import '../../data/models/earnings_model.dart';
import '../../data/models/commission_status_model.dart';

class EarningsPage extends StatefulWidget {
  const EarningsPage({super.key});

  @override
  State<EarningsPage> createState() => _EarningsPageState();
}

class _EarningsPageState extends State<EarningsPage> {
  EarningsPeriod _selectedPeriod = EarningsPeriod.daily;
  late final EarningsRemoteDataSource _dataSource;
  bool _isLoading = false;
  CommissionStatusModel? _commissionStatus;

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

      final results = await Future.wait([
        _dataSource.getEarnings(period: periodStr),
        _dataSource.getCommissionStatus(),
      ]);

      final liveData = results[0] as EarningsDataModel;
      final liveCommission = results[1] as CommissionStatusModel;

      if (mounted) {
        setState(() {
          _periodData[_selectedPeriod] = liveData;
          _commissionStatus = liveCommission;
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

              // 2.1 Commission Structure & Savings Breakdown Card
              _buildCommissionBreakdownCard(_commissionStatus),

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

          _buildBreakdownLine('Gross Earnings', data.grossEarnings, valueColor: AppColors.primary, isBold: true),
          const SizedBox(height: 10),
          _buildBreakdownLine(
            _commissionStatus != null
                ? 'Platform Deductions (${_commissionStatus!.effectiveCommissionPercentage} Comm)'
                : 'Platform Deductions',
            data.deductions,
            valueColor: AppColors.error,
            isBold: true,
          ),
          if (_commissionStatus?.hasSavings == true) ...[
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                InkWell(
                  onTap: () => context.push('/subscription'),
                  borderRadius: BorderRadius.circular(4),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Saving ${_commissionStatus!.commissionSavingsPercentage} on platform fee',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF15803D),
                          ),
                        ),
                        const SizedBox(width: 2),
                        const Icon(Icons.arrow_forward_ios_rounded, size: 8, color: Color(0xFF15803D)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ] else if (_commissionStatus != null && !_commissionStatus!.isSubscriber) ...[
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                InkWell(
                  onTap: () => context.push('/subscription'),
                  borderRadius: BorderRadius.circular(4),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Cut fees with a Driver Plan',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF2563EB),
                          ),
                        ),
                        SizedBox(width: 2),
                        Icon(Icons.arrow_forward_ios_rounded, size: 8, color: Color(0xFF2563EB)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],

          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 12),

          _buildBreakdownLine('Net Earnings', data.netEarnings, valueColor: AppColors.primary, isBold: true, isLarge: true),
        ],
      ),
    );
  }

  // ── Commission Structure & Savings Breakdown Card ──────────────────────────
  Widget _buildCommissionBreakdownCard(CommissionStatusModel? status) {
    final isSubscriber = status?.isSubscriber ?? false;
    final effectiveRate = status?.effectiveCommissionPercentage ?? '20%';
    final standardRate = status?.standardCommissionPercentage ?? '20%';
    final savingsPct = status?.commissionSavingsPercentage ?? '0%';
    final hasSavings = status?.hasSavings ?? false;
    final ruleName = status?.ruleName ?? 'Default Platform Commission';
    final resolutionTier = status?.resolutionTier ?? 'default';
    final bookingFeeWaived = status?.bookingFeeWaived ?? false;
    final bookingFeeFormatted = bookingFeeWaived
        ? 'Waived (₹0.00)'
        : '₹${(status != null ? status.bookingFee.toStringAsFixed(2) : "0.00")}';
    final activePlan = status?.activePlan;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isSubscriber ? const Color(0xFFBBF7D0) : const Color(0xFFF1F5F9),
          width: 1.2,
        ),
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
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isSubscriber ? const Color(0xFFDCFCE7) : const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      isSubscriber ? Icons.verified_user_rounded : Icons.shield_outlined,
                      color: isSubscriber ? AppColors.primary : AppColors.secondary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Commission Structure',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        ruleName,
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              InkWell(
                onTap: () => context.push('/subscription'),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: isSubscriber ? AppColors.primary : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isSubscriber) ...[
                        const Icon(Icons.check_rounded, color: Colors.white, size: 12),
                        const SizedBox(width: 3),
                      ],
                      Text(
                        isSubscriber ? (activePlan?.name ?? 'Subscriber Plan') : 'Standard Plan',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isSubscriber ? Colors.white : const Color(0xFF475569),
                        ),
                      ),
                      const SizedBox(width: 3),
                      Icon(
                        Icons.arrow_forward_ios_rounded,
                        size: 9,
                        color: isSubscriber ? Colors.white : const Color(0xFF64748B),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Rate Comparison 3-column Grid Box
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                // 1. Effective Commission Rate
                Expanded(
                  child: Column(
                    children: [
                      const Text(
                        'Your Rate',
                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        effectiveRate,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: isSubscriber ? AppColors.primary : const Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(width: 1, height: 32, color: const Color(0xFFE2E8F0)),
                // 2. Standard Platform Rate
                Expanded(
                  child: Column(
                    children: [
                      const Text(
                        'Standard',
                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        standardRate,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: isSubscriber ? const Color(0xFF94A3B8) : const Color(0xFF0F172A),
                          decoration: isSubscriber ? TextDecoration.lineThrough : null,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(width: 1, height: 32, color: const Color(0xFFE2E8F0)),
                // 3. Savings / Advantage
                Expanded(
                  child: InkWell(
                    onTap: () => context.push('/subscription'),
                    borderRadius: BorderRadius.circular(8),
                    child: Column(
                      children: [
                        const Text(
                          'You Save',
                          style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          hasSavings ? savingsPct : '0%',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: hasSavings ? AppColors.primary : const Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // Policy Entitlements (Booking Fee, Active Plan, Priority Bonus)
          _buildCommissionEntitlementRow(
            icon: Icons.receipt_long_rounded,
            iconColor: bookingFeeWaived ? AppColors.primary : const Color(0xFF64748B),
            label: 'Booking Fee',
            value: bookingFeeFormatted,
            valueColor: bookingFeeWaived ? AppColors.primary : const Color(0xFF0F172A),
            isBold: bookingFeeWaived,
          ),
          const SizedBox(height: 8),
          InkWell(
            onTap: () => context.push('/subscription'),
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                children: [
                  const Icon(Icons.card_membership_rounded, size: 16, color: AppColors.secondary),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Subscription Plan',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  Text(
                    activePlan?.name ?? 'Standard (Choose Plan)',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: activePlan != null ? AppColors.secondary : AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 16,
                    color: activePlan != null ? AppColors.secondary : AppColors.primary,
                  ),
                ],
              ),
            ),
          ),
          if (status?.priorityMatchingBonus != null && status!.priorityMatchingBonus > 0) ...[
            const SizedBox(height: 8),
            _buildCommissionEntitlementRow(
              icon: Icons.bolt_rounded,
              iconColor: const Color(0xFFD97706),
              label: 'Priority Matching Bonus',
              value: '+${status.priorityMatchingBonus} pts',
              valueColor: const Color(0xFFD97706),
              isBold: true,
            ),
          ],
          const SizedBox(height: 8),
          _buildCommissionEntitlementRow(
            icon: Icons.layers_outlined,
            iconColor: const Color(0xFF64748B),
            label: 'Resolution Tier',
            value: resolutionTier.toUpperCase(),
            valueColor: const Color(0xFF64748B),
            isBold: false,
          ),

          const SizedBox(height: 14),

          // Callout Banner & Action
          if (isSubscriber && hasSavings)
            InkWell(
              onTap: () => context.push('/subscription'),
              borderRadius: BorderRadius.circular(10),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFDCFCE7)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.celebration_rounded, color: Color(0xFF16A34A), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Your active plan saves you $savingsPct on every fare deduction.',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF15803D),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Plans',
                      style: TextStyle(
                        fontSize: 11,
                        color: Color(0xFF15803D),
                        fontWeight: FontWeight.bold,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: Color(0xFF15803D), size: 16),
                  ],
                ),
              ),
            )
          else
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFDBEAFE)),
              ),
              child: Row(
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Keep 95% - 100% of your earnings',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E40AF),
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Subscribe to a driver plan to cut platform commission to as low as 0%.',
                          style: TextStyle(
                            fontSize: 11,
                            color: Color(0xFF3B82F6),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () => context.push('/subscription'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.secondary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text(
                      'View Plans',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCommissionEntitlementRow({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    required Color valueColor,
    bool isBold = false,
  }) {
    return Row(
      children: [
        Icon(icon, size: 16, color: iconColor),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            color: valueColor,
          ),
        ),
      ],
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
