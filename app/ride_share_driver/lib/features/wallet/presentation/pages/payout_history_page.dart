import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/utils/currency_helper.dart';
import '../../../../injection_container.dart' as di;
import '../../../../common/widgets/custom_toast.dart';
import '../../../../style/appcolors.dart';
import '../../data/models/payout_item.dart';
import '../bloc/payout_history_bloc.dart';

class PayoutHistoryPage extends StatefulWidget {
  const PayoutHistoryPage({super.key});

  @override
  State<PayoutHistoryPage> createState() => _PayoutHistoryPageState();
}

class _PayoutHistoryPageState extends State<PayoutHistoryPage> {
  late final PayoutHistoryBloc _bloc;
  final ScrollController _scrollController = ScrollController();
  String _currentFilter = 'all';

  final List<({String key, String label, Color color})> _filterTabs = [
    (key: 'all', label: 'All', color: AppColors.primary),
    (key: 'completed', label: 'Completed', color: AppColors.primary),
    (key: 'processing', label: 'Processing', color: AppColors.secondary),
    (key: 'pending', label: 'Pending', color: AppColors.warning),
    (key: 'failed', label: 'Failed', color: AppColors.error),
  ];

  @override
  void initState() {
    super.initState();
    _bloc = di.sl<PayoutHistoryBloc>()..add(const LoadPayoutHistory());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      _bloc.add(const LoadMorePayoutHistory());
    }
  }

  String _formatDateTime(DateTime dt) {
    final now = DateTime.now();
    final isToday = dt.year == now.year && dt.month == now.month && dt.day == now.day;
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final minute = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    final timeStr = '$hour:$minute $period';

    if (isToday) return 'Today, $timeStr';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}, $timeStr';
  }

  void _onFilterChanged(String key) {
    if (_currentFilter == key) return;
    setState(() {
      _currentFilter = key;
    });
    _bloc.add(FilterPayoutStatus(key == 'all' ? null : key));
  }

  void _showPayoutDetailsModal(BuildContext context, PayoutItem payout) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final statusColor = payout.isCompleted
            ? AppColors.primary
            : payout.isProcessing
                ? AppColors.secondary
                : payout.isFailed
                    ? AppColors.error
                    : const Color(0xFFD97706);
        final statusBg = payout.isCompleted
            ? AppColors.primary.withValues(alpha: 0.1)
            : payout.isProcessing
                ? AppColors.secondary.withValues(alpha: 0.1)
                : payout.isFailed
                    ? AppColors.error.withValues(alpha: 0.1)
                    : const Color(0xFFFEF3C7);

        return Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 28,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top drag indicator
                Center(
                  child: Container(
                    width: 44,
                    height: 4.5,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Payout Receipt',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(ctx),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary, size: 22),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Amount and Status Hero
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '${CurrencyHelper.getSymbol(payout.currencyCode)}${payout.amount.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: statusBg,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              payout.isCompleted
                                  ? Icons.check_circle_rounded
                                  : payout.isProcessing
                                      ? Icons.sync_rounded
                                      : payout.isFailed
                                          ? Icons.cancel_rounded
                                          : Icons.schedule_rounded,
                              size: 14,
                              color: statusColor,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              payout.statusDisplay,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: statusColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Failure Alert Box if failed
                if (payout.isFailed && payout.failureReason != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Failure Reason',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: AppColors.error,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                payout.failureReason!,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.error,
                                  height: 1.35,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Breakdown Items
                _buildReceiptRow('Transfer Gateway', payout.gatewayDisplay, icon: Icons.payment_rounded),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                _buildReceiptRow('Initiated On', _formatDateTime(payout.createdAt), icon: Icons.event_note_rounded),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                _buildReceiptRow('Last Updated', _formatDateTime(payout.updatedAt), icon: Icons.update_rounded),
                if (payout.gatewayPayoutId != null && payout.gatewayPayoutId!.isNotEmpty) ...[
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _buildReceiptRowWithCopy(
                    context,
                    'Gateway Reference',
                    payout.gatewayPayoutId!,
                    icon: Icons.tag_rounded,
                  ),
                ],
                const Divider(height: 20, color: Color(0xFFF1F5F9)),
                _buildReceiptRowWithCopy(
                  context,
                  'Payout ID',
                  payout.id,
                  icon: Icons.fingerprint_rounded,
                ),
                if (payout.batchId != null) ...[
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _buildReceiptRowWithCopy(
                    context,
                    'Batch ID',
                    payout.batchId!,
                    icon: Icons.layers_outlined,
                  ),
                ],

                const SizedBox(height: 24),

                // Close Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: const Text('Close', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildReceiptRow(String label, String value, {IconData? icon}) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 8),
        ],
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _buildReceiptRowWithCopy(BuildContext context, String label, String value, {IconData? icon}) {
    final displayValue = value.length > 16 ? '${value.substring(0, 8)}...${value.substring(value.length - 6)}' : value;

    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 8),
        ],
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
        ),
        const Spacer(),
        InkWell(
          onTap: () {
            Clipboard.setData(ClipboardData(text: value));
            CustomToast.show(context, '$label copied to clipboard');
          },
          borderRadius: BorderRadius.circular(6),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  displayValue,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.secondary,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'monospace',
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.copy_rounded, size: 13, color: AppColors.secondary),
              ],
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _bloc,
      child: Scaffold(
        backgroundColor: AppColors.surface,
        appBar: AppBar(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary, size: 18),
            onPressed: () => context.pop(),
          ),
          title: const Text(
            'Payout History',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 17,
            ),
          ),
          centerTitle: true,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: AppColors.textPrimary, size: 22),
              onPressed: () => _bloc.add(LoadPayoutHistory(
                status: _currentFilter == 'all' ? null : _currentFilter,
                isRefresh: true,
              )),
            ),
            const SizedBox(width: 6),
          ],
        ),
        body: BlocConsumer<PayoutHistoryBloc, PayoutHistoryState>(
          listener: (context, state) {
            if (state is PayoutHistoryLoaded && state.actionError != null) {
              CustomToast.show(context, state.actionError!);
            }
          },
          builder: (context, state) {
            return Column(
              children: [
                // Top Summary Header Card in Brand Color
                _buildSummarySection(state),

                // Filter Tabs Bar
                _buildFilterChips(),

                // Payouts List / Loading / Empty
                Expanded(
                  child: _buildBodyContent(state),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildSummarySection(PayoutHistoryState state) {
    double totalCompleted = 0.0;
    int completedCount = 0;
    int pendingCount = 0;
    int failedCount = 0;

    if (state is PayoutHistoryLoaded) {
      totalCompleted = state.totalCompletedAmount;
      completedCount = state.completedCount;
      pendingCount = state.pendingCount;
      failedCount = state.failedCount;
    }

    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [
              AppColors.primary,
              Color(0xFF007A38),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.28),
              blurRadius: 14,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total Cashed Out',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Colors.white70,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.shield_outlined, size: 12, color: AppColors.accent),
                      SizedBox(width: 4),
                      Text(
                        'Direct to Bank',
                        style: TextStyle(fontSize: 10, color: AppColors.accent, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${CurrencyHelper.getSymbol(state is PayoutHistoryLoaded && state.payouts.isNotEmpty ? state.payouts.first.currencyCode : "CAD")}${totalCompleted.toStringAsFixed(2)}',
              style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.only(top: 10),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.18))),
              ),
              child: Row(
                children: [
                  _buildStatDot('Completed', completedCount, Colors.white),
                  const SizedBox(width: 16),
                  _buildStatDot('Pending', pendingCount, AppColors.accent),
                  const SizedBox(width: 16),
                  _buildStatDot('Failed', failedCount, const Color(0xFFFECACA)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatDot(String label, int count, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 5),
        Text(
          '$label: $count',
          style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _buildFilterChips() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.only(bottom: 12, top: 4),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        physics: const BouncingScrollPhysics(),
        child: Row(
          children: _filterTabs.map((tab) {
            final isSelected = _currentFilter == tab.key;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: InkWell(
                onTap: () => _onFilterChanged(tab.key),
                borderRadius: BorderRadius.circular(20),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primary : AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : AppColors.border,
                    ),
                  ),
                  child: Text(
                    tab.label,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      color: isSelected ? Colors.white : AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildBodyContent(PayoutHistoryState state) {
    if (state is PayoutHistoryLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (state is PayoutHistoryError) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded, size: 48, color: AppColors.textSecondary),
              const SizedBox(height: 12),
              const Text(
                'Unable to Load Payouts',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 6),
              Text(
                state.message,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => _bloc.add(LoadPayoutHistory(
                  status: _currentFilter == 'all' ? null : _currentFilter,
                )),
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('Try Again'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (state is PayoutHistoryLoaded) {
      final payouts = state.payouts;

      if (payouts.isEmpty) {
        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            _bloc.add(LoadPayoutHistory(
              status: _currentFilter == 'all' ? null : _currentFilter,
              isRefresh: true,
            ));
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 60, horizontal: 30),
              alignment: Alignment.center,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.account_balance_wallet_outlined, size: 36, color: AppColors.primary),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _currentFilter == 'all' ? 'No Payout History Yet' : 'No ${_currentFilter[0].toUpperCase()}${_currentFilter.substring(1)} Payouts',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'When you withdraw your wallet balance, each transaction record, gateway reference, and status will appear here.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                  ),
                ],
              ),
            ),
          ),
        );
      }

      return RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async {
          _bloc.add(LoadPayoutHistory(
            status: _currentFilter == 'all' ? null : _currentFilter,
            isRefresh: true,
          ));
        },
        child: ListView.builder(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          itemCount: payouts.length + (state.isLoadingMore ? 1 : 0),
          itemBuilder: (context, index) {
            if (index == payouts.length) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(
                  child: CircularProgressIndicator(strokeWidth: 2.5, color: AppColors.primary),
                ),
              );
            }

            final payout = payouts[index];
            return _buildPayoutCard(payout);
          },
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildPayoutCard(PayoutItem payout) {
    final statusColor = payout.isCompleted
        ? AppColors.primary
        : payout.isProcessing
            ? AppColors.secondary
            : payout.isFailed
                ? AppColors.error
                : const Color(0xFFD97706);
    final statusBg = payout.isCompleted
        ? AppColors.primary.withValues(alpha: 0.1)
        : payout.isProcessing
            ? AppColors.secondary.withValues(alpha: 0.1)
            : payout.isFailed
                ? AppColors.error.withValues(alpha: 0.1)
                : const Color(0xFFFEF3C7);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: payout.isFailed ? AppColors.error.withValues(alpha: 0.4) : AppColors.border,
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showPayoutDetailsModal(context, payout),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Gateway Badge & Status Pill
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.secondary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            payout.gateway.toLowerCase() == 'stripe' ? Icons.credit_card_rounded : Icons.account_balance_rounded,
                            size: 13,
                            color: AppColors.secondary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            payout.gatewayDisplay,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.secondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        payout.statusDisplay,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: statusColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Middle Row: Amount & Arrow Icon
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${CurrencyHelper.getSymbol(payout.currencyCode)}${payout.amount.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary, size: 20),
                  ],
                ),
                const SizedBox(height: 6),

                // Bottom Row: Date and Reference
                Row(
                  children: [
                    Icon(Icons.schedule_rounded, size: 13, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Text(
                      _formatDateTime(payout.createdAt),
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                    ),
                    if (payout.gatewayPayoutId != null && payout.gatewayPayoutId!.isNotEmpty) ...[
                      const Spacer(),
                      Text(
                        'Ref: ${payout.gatewayPayoutId!.length > 10 ? payout.gatewayPayoutId!.substring(0, 10) : payout.gatewayPayoutId}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.secondary,
                          fontWeight: FontWeight.w500,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ],
                ),

                // Failure warning if failed
                if (payout.isFailed && payout.failureReason != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Failed: ${payout.failureReason!}',
                      style: const TextStyle(fontSize: 11, color: AppColors.error, fontWeight: FontWeight.w500),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
