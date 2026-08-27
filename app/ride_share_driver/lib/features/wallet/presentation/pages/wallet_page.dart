import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

    final TextEditingController amountController = TextEditingController(
      text: balance.toStringAsFixed(2),
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final double enteredAmount = double.tryParse(amountController.text) ?? 0.0;
            final bool isValidAmount = enteredAmount > 0 && enteredAmount <= balance;

            void selectPreset(double amt) {
              final double target = amt > balance ? balance : amt;
              amountController.text = target.toStringAsFixed(2);
              amountController.selection = TextSelection.fromPosition(
                TextPosition(offset: amountController.text.length),
              );
              setModalState(() {});
            }

            return Container(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 12,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
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
                    // Top Drag handle
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
                    const SizedBox(height: 16),

                    // Header Row: Title + Close Icon
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Cashout / Withdraw',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(
                            Icons.close_rounded,
                            color: Color(0xFF0F172A),
                            size: 22,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // 1. Available Balance
                    const Text(
                      'Available Balance',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '₹${balance.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF009048),
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 2. Enter Amount
                    const Text(
                      'Enter Amount',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Big Amount Input Box (Clean Borderless Style)
                    Container(
                      height: 56,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Text(
                            '₹',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: amountController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              inputFormatters: [
                                FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                              ],
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0F172A),
                              ),
                              decoration: const InputDecoration(
                                hintText: '0.00',
                                hintStyle: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF94A3B8),
                                ),
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                isDense: true,
                              ),
                              onChanged: (_) => setModalState(() {}),
                            ),
                          ),
                        ],
                      ),
                    ),

                    if (enteredAmount > balance) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, size: 14, color: Color(0xFFEF4444)),
                          const SizedBox(width: 5),
                          Text(
                            'Amount exceeds available balance (₹${balance.toStringAsFixed(2)})',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFFEF4444),
                            ),
                          ),
                        ],
                      ),
                    ],

                    const SizedBox(height: 12),

                    // Dynamic Variable Preset Buttons based on Available Balance
                    Builder(
                      builder: (context) {
                        List<double> presets = [];
                        if (balance >= 10000) {
                          presets = [1000, 2500, 5000];
                        } else if (balance >= 5000) {
                          presets = [500, 1000, 2000];
                        } else if (balance >= 2000) {
                          presets = [500, 1000, 1500];
                        } else if (balance >= 1000) {
                          presets = [200, 500, 800];
                        } else if (balance >= 500) {
                          presets = [100, 250, 400];
                        } else if (balance >= 200) {
                          presets = [50, 100, 150];
                        } else if (balance >= 50) {
                          final p1 = ((balance * 0.25) / 10).round() * 10.0;
                          final p2 = ((balance * 0.50) / 10).round() * 10.0;
                          final p3 = ((balance * 0.75) / 10).round() * 10.0;
                          presets = [
                            p1.clamp(10.0, balance),
                            p2.clamp(20.0, balance),
                            p3.clamp(30.0, balance),
                          ];
                        } else {
                          presets = [10, 20, (balance > 0 ? balance : 50)];
                        }

                        String formatPreset(double amt) {
                          final intVal = amt.round();
                          if (intVal >= 1000) {
                            return '₹${intVal.toString().replaceAllMapped(RegExp(r'(\d+?)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
                          }
                          return '₹$intVal';
                        }

                        return Row(
                          children: [
                            ...presets.map((amt) => Expanded(
                              child: Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: _buildPresetButton(
                                  formatPreset(amt),
                                  amt,
                                  enteredAmount,
                                  selectPreset,
                                ),
                              ),
                            )),
                            Expanded(
                              child: _buildPresetButton(
                                'All',
                                balance,
                                enteredAmount,
                                selectPreset,
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 24),

                    // 3. Payout To
                    const Text(
                      'Payout To',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Bank Details Card
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: const BoxDecoration(
                              color: Color(0xFFE8F5E9),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.account_balance_outlined,
                              color: Color(0xFF009048),
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  (bankDetails?.bankName != null && bankDetails!.bankName!.isNotEmpty)
                                      ? bankDetails.bankName!
                                      : 'Bank of India',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  (bankDetails?.accountNumberLast4 != null && bankDetails!.accountNumberLast4!.isNotEmpty)
                                      ? '**** **** ${bankDetails.accountNumberLast4}'
                                      : '**** **** 2345',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF64748B),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(
                            Icons.chevron_right_rounded,
                            color: Color(0xFF0F172A),
                            size: 22,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 4. Info Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                      ),
                      child: const Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.info_outline_rounded,
                            color: Color(0xFF2563EB),
                            size: 22,
                          ),
                          SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Cashout will be transferred to your bank account within 24 hours.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF475569),
                                height: 1.35,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // 5. Withdraw Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: isValidAmount
                            ? () {
                                Navigator.pop(ctx);
                                _bloc.add(RequestInstantPayout(amount: enteredAmount));
                              }
                            : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF009048),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFFA7F3D0),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: const Text(
                          'Withdraw',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
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

  Widget _buildPresetButton(
    String label,
    double amt,
    double currentAmt,
    Function(double) onSelect,
  ) {
    final bool isSelected = (amt - currentAmt).abs() < 0.5;
    return GestureDetector(
      onTap: () => onSelect(amt),
      child: Container(
        height: 42,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFDCFCE7) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
            width: 1.2,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: isSelected ? const Color(0xFF009048) : const Color(0xFF0F172A),
          ),
        ),
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
