import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/wallet_bloc.dart';

class WalletPage extends StatefulWidget {
  const WalletPage({super.key});

  @override
  State<WalletPage> createState() => _WalletPageState();
}

class _WalletPageState extends State<WalletPage> {
  @override
  void initState() {
    super.initState();
    context.read<WalletBloc>().add(LoadWalletDetails());
  }

  String _monthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[(month - 1).clamp(0, 11)];
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final minute = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }

  List<Map<String, dynamic>> _parseTransactions(List<Map<String, dynamic>> raw) {
    return raw.map((t) {
      final amount = (t['amount'] as num?)?.toDouble() ?? 0.0;
      final type = t['type']?.toString().toLowerCase() ?? '';
      final isAdd = type.contains('topup') ||
          type.contains('credit') ||
          type.contains('add') ||
          type.contains('bonus') ||
          type.contains('deposit');
      final desc = isAdd ? 'Top Up' : 'Ride Payment';
      final dateStr = t['date']?.toString() ?? '';
      DateTime? dt = DateTime.tryParse(dateStr);
      final formattedDate = dt != null
          ? '${dt.day} ${_monthName(dt.month)}, ${_formatTime(dt)}'
          : (dateStr.isNotEmpty ? dateStr : 'Recent');

      return {
        'id': t['id']?.toString() ?? '',
        'title': desc,
        'date': formattedDate,
        'amount': amount.toStringAsFixed(amount.truncateToDouble() == amount ? 0 : 2),
        'isAdd': isAdd,
        'rawDate': dt ?? DateTime.now(),
      };
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: Color(0xFF0A2540), size: 26),
          onPressed: () => Scaffold.of(context).openDrawer(),
        ),
        title: const Text(
          'Wallet',
          style: TextStyle(
            color: Color(0xFF0A2540),
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded, color: Color(0xFF0A2540), size: 26),
            onPressed: () => context.push('/notifications'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: BlocBuilder<WalletBloc, WalletState>(
        builder: (context, state) {
          double balance = 0.0;
          String currencySymbol = '₹';
          List<Map<String, dynamic>> recentTxs = [];

          if (state is WalletLoaded) {
            balance = state.balance;
            currencySymbol = state.currency == 'CAD' ? '\$' : '₹';
            recentTxs = _parseTransactions(state.transactions);
          } else if (state is WalletLoading) {
            // Keep previous data if any
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<WalletBloc>().add(LoadWalletDetails());
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Wallet Container with custom background asset
                  Container(
                    width: double.infinity,
                    height: 140,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      image: const DecorationImage(
                        image: AssetImage('assets/images/wallet-bg.png'),
                        fit: BoxFit.cover,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0165B7).withValues(alpha: 0.2),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Wallet Balance',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '$currencySymbol${balance.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 2. Action Buttons Row: Add Money & Transactions
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => context.push('/add-funds'),
                          child: Container(
                            height: 72,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  width: 28,
                                  height: 28,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Color(0xFF009048),
                                  ),
                                  child: const Icon(
                                    Icons.add_rounded,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Add Money',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0A2540),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => context.push('/transactions'),
                          child: Container(
                            height: 72,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.format_list_bulleted_rounded,
                                  color: Color(0xFF0A2540),
                                  size: 24,
                                ),
                                SizedBox(height: 6),
                                Text(
                                  'Transactions',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0A2540),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // 3. Recent Transactions Title & View All
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Recent Transactions',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF0A2540),
                        ),
                      ),
                      if (recentTxs.isNotEmpty)
                        GestureDetector(
                          onTap: () => context.push('/transactions'),
                          child: const Text(
                            'View All',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0065B3),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Transactions List or Empty State
                  if (recentTxs.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: const [
                          Icon(Icons.receipt_long_rounded, size: 40, color: Color(0xFF94A3B8)),
                          SizedBox(height: 10),
                          Text(
                            'No transactions yet',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0A2540)),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Add money or take a ride to see transactions here',
                            style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: recentTxs.take(5).length,
                      separatorBuilder: (context, index) =>
                          const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      itemBuilder: (context, index) {
                        return _buildTransactionItem(recentTxs[index], currencySymbol);
                      },
                    ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTransactionItem(Map<String, dynamic> tx, String currencySymbol) {
    final isAdd = tx['isAdd'] as bool;
    final assetPath = isAdd ? 'assets/icons/money-in.png' : 'assets/icons/cab-payment.png';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isAdd ? const Color(0xFFE6F4EA) : const Color(0xFFF1F5F9),
            ),
            child: Image.asset(
              assetPath,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) => Icon(
                isAdd ? Icons.add_card_rounded : Icons.directions_car_filled_rounded,
                color: isAdd ? const Color(0xFF009048) : const Color(0xFF0A2540),
                size: 20,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx['title'] as String,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0A2540),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  tx['date'] as String,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
          Text(
            '${isAdd ? '+' : '-'} $currencySymbol${tx['amount']}',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: isAdd ? const Color(0xFF009048) : const Color(0xFF0A2540),
            ),
          ),
        ],
      ),
    );
  }
}
