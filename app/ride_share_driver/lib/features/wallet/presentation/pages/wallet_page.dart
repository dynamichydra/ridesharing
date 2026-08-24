import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../common/widgets/custom_toast.dart';
import '../../../../injection_container.dart' as di;
import '../bloc/wallet_bloc.dart';
import '../../../../presentation/screens/dashboard/driver_main_layout.dart';

class WalletPage extends StatefulWidget {
  const WalletPage({super.key});

  @override
  State<WalletPage> createState() => _WalletPageState();
}

class _WalletPageState extends State<WalletPage> {
  late final WalletBloc _bloc = di.sl<WalletBloc>();

  @override
  void initState() {
    super.initState();
    _bloc.add(LoadWalletData());
  }

  @override
  void dispose() {
    _bloc.close();
    super.dispose();
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final isToday = dt.year == now.year && dt.month == now.month && dt.day == now.day;
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final minute = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    final timeStr = '$hour:$minute $period';

    if (isToday) return 'Today, $timeStr';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${dt.day} ${months[dt.month - 1]}, $timeStr';
  }

  void _showInstantPayoutDialog(BuildContext context, double balance, BankDetails? bankDetails) {
    if (balance <= 0) {
      CustomToast.show(context, 'You need a positive wallet balance to cash out');
      return;
    }

    final hasBank = bankDetails != null &&
        ((bankDetails.accountNumberLast4 != null && bankDetails.accountNumberLast4!.isNotEmpty) ||
            (bankDetails.upiId != null && bankDetails.upiId!.isNotEmpty));

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.account_balance_wallet_rounded, color: Color(0xFF0065B3), size: 24),
            SizedBox(width: 8),
            Text('Instant Cash Out', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF021B47), fontSize: 18)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Payout Amount: ₹${balance.toStringAsFixed(2)}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF009048)),
            ),
            const SizedBox(height: 12),
            if (hasBank) ...[
              const Text('Transferring directly to:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E7E9)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.account_balance_rounded, color: Color(0xFF021B47), size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        bankDetails.upiId != null && bankDetails.upiId!.isNotEmpty
                            ? 'UPI: ${bankDetails.upiId}'
                            : '${bankDetails.bankName ?? "Bank"} (••• ${bankDetails.accountNumberLast4})',
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF021B47)),
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF3CD),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Color(0xFF856404), size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Please verify your bank/UPI details on file before initiating cash out.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF856404)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _bloc.add(RequestInstantPayout());
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF009048),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Confirm Cash Out'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _bloc,
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.menu_rounded, color: Color(0xFF021B47), size: 26),
            onPressed: () => DriverMainLayout.openDrawer(),
          ),
          title: const Text(
            'Driver Wallet',
            style: TextStyle(
              color: Color(0xFF021B47),
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          centerTitle: true,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: Color(0xFF021B47), size: 22),
              onPressed: () => _bloc.add(LoadWalletData()),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: BlocConsumer<WalletBloc, WalletState>(
          listener: (context, state) {
            if (state is WalletActionSuccess) {
              CustomToast.show(context, state.message);
            } else if (state is WalletError) {
              CustomToast.show(context, state.message);
            }
          },
          builder: (context, state) {
            double balance = 0.0;
            bool isNegative = false;
            BankDetails? bankDetails;
            List<WalletTransactionItem> txs = [];

            if (state is WalletLoaded) {
              balance = state.walletInfo?.balanceAmount ?? 0.0;
              isNegative = state.walletInfo?.isNegative ?? false;
              bankDetails = state.bankDetails;
              txs = state.transactions;
            }

            return RefreshIndicator(
              onRefresh: () async {
                _bloc.add(LoadWalletData());
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Hero Balance Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: isNegative
                              ? [const Color(0xFFC62828), const Color(0xFF8E0000)]
                              : [const Color(0xFF0065B3), const Color(0xFF004580)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: (isNegative ? const Color(0xFFC62828) : const Color(0xFF0065B3)).withValues(alpha: 0.25),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isNegative ? 'Commission Due (Negative)' : 'Available Balance',
                                style: const TextStyle(fontSize: 13, color: Colors.white70, fontWeight: FontWeight.w500),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                '${isNegative ? "-₹" : "₹"}${balance.abs().toStringAsFixed(2)}',
                                style: const TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              if (isNegative) ...[
                                const SizedBox(height: 4),
                                const Text(
                                  'Settle via cash rides or ride earnings',
                                  style: TextStyle(fontSize: 11, color: Colors.white70),
                                ),
                              ],
                            ],
                          ),
                          Container(
                            width: 54,
                            height: 54,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 28),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 2. Action Button: Cash Out
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: () => _showInstantPayoutDialog(context, balance, bankDetails),
                        icon: const Icon(Icons.account_balance_rounded, size: 20),
                        label: const Text('Cash Out', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF009048),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // 3. Recent Transactions Header & View All
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Recent Transactions',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF021B47),
                          ),
                        ),
                        if (txs.isNotEmpty)
                          GestureDetector(
                            onTap: () => context.push('/transactions'),
                            child: const Text(
                              'View All',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF0065B3),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // 4. Transaction Items List
                    if (txs.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Column(
                          children: [
                            Icon(Icons.receipt_long_rounded, size: 40, color: Color(0xFF94A3B8)),
                            SizedBox(height: 10),
                            Text(
                              'No transactions yet',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Your ride earnings, commission deductions, and payouts will appear here',
                              style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      )
                    else
                      ...txs.take(5).map((tx) => _buildTransactionCard(tx)),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildTransactionCard(WalletTransactionItem tx) {
    final isCredit = tx.isCredit;

    IconData iconData = isCredit ? Icons.directions_car_filled_rounded : Icons.account_balance_rounded;
    Color iconColor = isCredit ? const Color(0xFF009048) : const Color(0xFFE53935);
    Color bgColor = isCredit ? const Color(0xFFE6F4EA) : const Color(0xFFFDE8E8);

    if (tx.reason.contains('commission')) {
      iconData = Icons.receipt_outlined;
    } else if (tx.reason.contains('bonus') || tx.reason.contains('incentive')) {
      iconData = Icons.card_giftcard_rounded;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E7E9)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: bgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(iconData, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx.description,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                ),
                const SizedBox(height: 2),
                Text(
                  _formatDate(tx.createdAt),
                  style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                ),
              ],
            ),
          ),
          Text(
            '${isCredit ? '+' : '-'} ₹${tx.amount.toStringAsFixed(tx.amount.truncateToDouble() == tx.amount ? 0 : 2)}',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: isCredit ? const Color(0xFF009048) : const Color(0xFFE53935),
            ),
          ),
        ],
      ),
    );
  }
}
