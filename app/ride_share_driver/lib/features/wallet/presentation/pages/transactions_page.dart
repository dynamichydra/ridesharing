import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../injection_container.dart' as di;
import '../bloc/wallet_bloc.dart';

class TransactionsPage extends StatefulWidget {
  const TransactionsPage({super.key});

  @override
  State<TransactionsPage> createState() => _TransactionsPageState();
}

class _TransactionsPageState extends State<TransactionsPage> {
  late final WalletBloc _bloc = di.sl<WalletBloc>();
  String _selectedTab = 'All'; // 'All', 'Credits', 'Debits'

  @override
  void initState() {
    super.initState();
    _bloc.add(LoadWalletData());
  }

  @override
  void dispose() {
    super.dispose();
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final minute = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }

  String _monthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[(month - 1).clamp(0, 11)];
  }

  String _groupDate(DateTime dt) {
    final now = DateTime.now();
    if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
      return 'Today';
    }
    final yesterday = now.subtract(const Duration(days: 1));
    if (dt.year == yesterday.year && dt.month == yesterday.month && dt.day == yesterday.day) {
      return 'Yesterday';
    }
    return '${dt.day} ${_monthName(dt.month)} ${dt.year}';
  }

  Map<String, List<WalletTransactionItem>> _groupByDate(List<WalletTransactionItem> list) {
    final Map<String, List<WalletTransactionItem>> groups = {};
    for (final tx in list) {
      final key = _groupDate(tx.createdAt);
      groups.putIfAbsent(key, () => []).add(tx);
    }
    return groups;
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
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF021B47), size: 20),
            onPressed: () => context.pop(),
          ),
          title: const Text(
            'Transactions',
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
        body: BlocBuilder<WalletBloc, WalletState>(
          builder: (context, state) {
            List<WalletTransactionItem> allTxs = [];
            if (state is WalletLoaded) {
              allTxs = state.transactions;
            }

            List<WalletTransactionItem> filtered = allTxs.where((tx) {
              if (_selectedTab == 'Ride Earnings') {
                return tx.isCredit;
              }
              if (_selectedTab == 'Commission Due') {
                return !tx.isCredit && (tx.reason.contains('commission') || tx.description.toLowerCase().contains('commission'));
              }
              if (_selectedTab == 'Cash Out') {
                return !tx.isCredit &&
                    (tx.reason.contains('payout') ||
                    tx.reason.contains('withdrawal') ||
                    tx.description.toLowerCase().contains('cash out'));
              }
              return true;
            }).toList();

            final grouped = _groupByDate(filtered);

            return Column(
              children: [
                // Tabs: All, Ride Earnings, Commission Due, Cash Out
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      children: ['All', 'Ride Earnings', 'Commission Due', 'Cash Out'].map((tab) {
                        final isSelected = _selectedTab == tab;
                        return Padding(
                          padding: const EdgeInsets.only(right: 10),
                          child: InkWell(
                            onTap: () {
                              setState(() {
                                _selectedTab = tab;
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
                ),
                const SizedBox(height: 8),

                // Transactions List
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: () async {
                      _bloc.add(LoadWalletData());
                    },
                    child: filtered.isEmpty
                        ? Center(
                            child: SingleChildScrollView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.all(40),
                              child: Column(
                                children: [
                                  const Icon(Icons.receipt_long_rounded, size: 48, color: Color(0xFFCBD5E1)),
                                  const SizedBox(height: 12),
                                  Text(
                                    state is WalletLoading ? 'Loading transactions...' : 'No transactions found',
                                    style: const TextStyle(color: Color(0xFF8A94A6), fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.builder(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                            itemCount: grouped.length,
                            itemBuilder: (context, index) {
                              final dateKey = grouped.keys.elementAt(index);
                              final txs = grouped[dateKey]!;

                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    dateKey,
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                                  ),
                                  const SizedBox(height: 10),
                                  ...txs.map((tx) => _buildTransactionCard(tx)),
                                  const SizedBox(height: 16),
                                ],
                              );
                            },
                          ),
                  ),
                ),
              ],
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
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E7E9)),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: bgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(iconData, color: iconColor, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx.description,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                ),
                const SizedBox(height: 2),
                Text(
                  _formatTime(tx.createdAt),
                  style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                ),
              ],
            ),
          ),
          Text(
            '${isCredit ? '+' : '-'} ₹${tx.amount.toStringAsFixed(tx.amount.truncateToDouble() == tx.amount ? 0 : 2)}',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: isCredit ? const Color(0xFF009048) : const Color(0xFFE53935),
            ),
          ),
        ],
      ),
    );
  }
}
