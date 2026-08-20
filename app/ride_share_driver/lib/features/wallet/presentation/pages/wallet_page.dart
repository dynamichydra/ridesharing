import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../injection_container.dart' as di;
import '../bloc/wallet_bloc.dart';

class WalletPage extends StatefulWidget {
  const WalletPage({super.key});

  @override
  State<WalletPage> createState() => _WalletPageState();
}

class _WalletPageState extends State<WalletPage> {
  late final WalletBloc _bloc = di.sl<WalletBloc>();

  final double _balance = 320.50;

  final List<Map<String, dynamic>> _recentTxs = [
    {
      'title': 'Ride Payment',
      'subtitle': 'Today, 07:45 AM',
      'amount': 125.0,
      'isCredit': true,
      'type': 'ride',
    },
    {
      'title': 'Incentive',
      'subtitle': 'Today, 11:30 AM',
      'amount': 30.0,
      'isCredit': true,
      'type': 'incentive',
    },
    {
      'title': 'Cash Withdrawal',
      'subtitle': 'Yesterday, 10:20 PM',
      'amount': 500.0,
      'isCredit': false,
      'type': 'withdrawal',
    },
    {
      'title': 'Ride Payment',
      'subtitle': 'Yesterday, 08:40 PM',
      'amount': 90.0,
      'isCredit': true,
      'type': 'ride',
    },
  ];

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

  void _showAddMoneyDialog(BuildContext context) {
    final amountController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Add Money to Wallet', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
        content: TextField(
          controller: amountController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'Amount (₹)',
            hintText: '500',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Top-up initiated successfully'), backgroundColor: Color(0xFF009048)),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF009048),
              foregroundColor: Colors.white,
            ),
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _showWithdrawDialog(BuildContext context) {
    final amountController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Withdraw Money', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
        content: TextField(
          controller: amountController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'Amount to withdraw (₹)',
            hintText: '300',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Withdrawal request submitted!'), backgroundColor: Color(0xFF009048)),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF009048),
              foregroundColor: Colors.white,
            ),
            child: const Text('Withdraw'),
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
          leading: Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu_rounded, color: Color(0xFF021B47), size: 26),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ),
          title: const Text(
            'Wallet',
            style: TextStyle(
              color: Color(0xFF021B47),
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          centerTitle: true,
          actions: [
            IconButton(
              icon: const Icon(Icons.help_outline_rounded, color: Color(0xFF021B47), size: 22),
              onPressed: () {},
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Blue Hero Card with Graphic
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0065B3), Color(0xFF004580)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0065B3).withValues(alpha: 0.25),
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
                        const Text(
                          'Current Balance',
                          style: TextStyle(fontSize: 13, color: Colors.white70, fontWeight: FontWeight.w500),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '₹${_balance.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                        ),
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

              // 2. Action Buttons Row: Add Money & Withdraw
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: () => _showAddMoneyDialog(context),
                        icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                        label: const Text('Add Money', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF009048),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: OutlinedButton.icon(
                        onPressed: () => _showWithdrawDialog(context),
                        icon: const Icon(Icons.account_balance_rounded, size: 18, color: Color(0xFF021B47)),
                        label: const Text('Withdraw', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF021B47))),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFE2E7E9)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ),
                ],
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

              // Transaction Items
              ..._recentTxs.map((tx) => _buildRecentTxItem(tx)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentTxItem(Map<String, dynamic> tx) {
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
                  tx['title'] as String,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                ),
                const SizedBox(height: 2),
                Text(
                  tx['subtitle'] as String,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6)),
                ),
              ],
            ),
          ),
          Text(
            '${isCredit ? '+' : '-'} ₹${amount.toStringAsFixed(0)}',
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
