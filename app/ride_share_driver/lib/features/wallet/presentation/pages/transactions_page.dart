import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class TransactionsPage extends StatefulWidget {
  const TransactionsPage({super.key});

  @override
  State<TransactionsPage> createState() => _TransactionsPageState();
}

class _TransactionsPageState extends State<TransactionsPage> {
  String _selectedTab = 'All'; // 'All', 'Credits', 'Debits'

  final List<Map<String, dynamic>> _todayTxs = [
    {
      'title': 'Ride Payment',
      'time': '07:45 AM',
      'amount': 125.0,
      'isCredit': true,
      'type': 'ride',
    },
    {
      'title': 'Incentive',
      'time': '11:30 AM',
      'amount': 30.0,
      'isCredit': true,
      'type': 'incentive',
    },
  ];

  final List<Map<String, dynamic>> _yesterdayTxs = [
    {
      'title': 'Cash Withdrawal',
      'time': '10:20 PM',
      'amount': 500.0,
      'isCredit': false,
      'type': 'withdrawal',
    },
    {
      'title': 'Ride Payment',
      'time': '08:40 PM',
      'amount': 90.0,
      'isCredit': true,
      'type': 'ride',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
            icon: const Icon(Icons.filter_list_rounded, color: Color(0xFF021B47), size: 24),
            onPressed: () {},
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // 1. Tabs: All, Credits, Debits
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: ['All', 'Credits', 'Debits'].map((tab) {
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
          const SizedBox(height: 8),

          // 2. Transaction List Grouped by Date
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_filterList(_todayTxs).isNotEmpty) ...[
                    const Text(
                      'Today',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                    ),
                    const SizedBox(height: 10),
                    ..._filterList(_todayTxs).map((tx) => _buildTransactionCard(tx)),
                    const SizedBox(height: 16),
                  ],

                  if (_filterList(_yesterdayTxs).isNotEmpty) ...[
                    const Text(
                      'Yesterday',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                    ),
                    const SizedBox(height: 10),
                    ..._filterList(_yesterdayTxs).map((tx) => _buildTransactionCard(tx)),
                    const SizedBox(height: 16),
                  ],

                  if (_filterList(_todayTxs).isEmpty && _filterList(_yesterdayTxs).isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          children: const [
                            Icon(Icons.receipt_long_rounded, size: 48, color: Color(0xFFCBD5E1)),
                            SizedBox(height: 12),
                            Text('No transactions found', style: TextStyle(color: Color(0xFF8A94A6), fontWeight: FontWeight.bold)),
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

  List<Map<String, dynamic>> _filterList(List<Map<String, dynamic>> list) {
    return list.where((tx) {
      if (_selectedTab == 'Credits' && tx['isCredit'] != true) return false;
      if (_selectedTab == 'Debits' && tx['isCredit'] != false) return false;
      return true;
    }).toList();
  }

  Widget _buildTransactionCard(Map<String, dynamic> tx) {
    final isCredit = tx['isCredit'] == true;
    final double amount = (tx['amount'] as num).toDouble();
    final String type = tx['type']?.toString() ?? '';

    IconData iconData = Icons.directions_car_filled_rounded;
    Color iconColor = const Color(0xFF009048);
    Color bgColor = const Color(0xFFE6F4EA);

    if (type == 'incentive') {
      iconData = Icons.card_giftcard_rounded;
      iconColor = const Color(0xFF009048);
      bgColor = const Color(0xFFE6F4EA);
    } else if (type == 'withdrawal') {
      iconData = Icons.account_balance_rounded;
      iconColor = const Color(0xFFE53935);
      bgColor = const Color(0xFFFDE8E8);
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
                  tx['title'] as String,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                ),
                const SizedBox(height: 2),
                Text(
                  tx['time'] as String,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                ),
              ],
            ),
          ),
          Text(
            '${isCredit ? '+' : '-'} ₹${amount.toStringAsFixed(0)}',
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
