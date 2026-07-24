import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/error_view.dart';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Wallet',
          style: TextStyle(color: Color(0xFF021B47), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: Colors.black87, size: 24),
          onPressed: () => Scaffold.of(context).openDrawer(),
        ),
      ),
      body: BlocBuilder<WalletBloc, WalletState>(
        builder: (context, state) {
          if (state is WalletLoading) {
            return const LoadingView();
          }

          if (state is WalletError) {
            return ErrorView(
              message: state.message,
              onRetry: () => context.read<WalletBloc>().add(LoadWalletDetails()),
            );
          }

          if (state is WalletLoaded) {
            final recentTxs = state.transactions.take(4).toList();

            return RefreshIndicator(
              onRefresh: () async {
                context.read<WalletBloc>().add(LoadWalletDetails());
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Sleek Wallet Balance Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF0165B7), Color(0xFF0C82DF)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF0165B7).withOpacity(0.15),
                            blurRadius: 12,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Wallet Balance',
                                  style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '${AppConstants.currencySymbol}${state.balance.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 32,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Wallet representation graphic / icon
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.12),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.account_balance_wallet_rounded,
                              color: Colors.white,
                              size: 36,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 2. Action buttons row: Add Money, Transactions
                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 48,
                            child: OutlinedButton.icon(
                              onPressed: () => context.push('/add-funds'),
                              icon: const Icon(Icons.add_rounded, color: Color(0xFF01A34D), size: 20),
                              label: const Text(
                                'Add Money',
                                style: TextStyle(color: Color(0xFF01A34D), fontWeight: FontWeight.bold),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Color(0xFFE2E7E9)),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: SizedBox(
                            height: 48,
                            child: OutlinedButton.icon(
                              onPressed: () => context.push('/transactions'),
                              icon: const Icon(Icons.list_alt_rounded, color: Color(0xFF021B47), size: 20),
                              label: const Text(
                                'Transactions',
                                style: TextStyle(color: Color(0xFF021B47), fontWeight: FontWeight.bold),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Color(0xFFE2E7E9)),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 28),

                    // 3. Transactions Section
                    const Text(
                      'Recent Transactions',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF021B47),
                      ),
                    ),
                    const SizedBox(height: 12),

                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: recentTxs.length,
                      separatorBuilder: (context, index) => const Divider(height: 20),
                      itemBuilder: (context, index) {
                        final tx = recentTxs[index];
                        final isTopup = tx['type'] == 'topup';
                        final amount = (tx['amount'] as num).toDouble();
                        final String sign = isTopup ? '+' : '-';
                        final Color amountColor = isTopup ? const Color(0xFF01A34D) : const Color(0xFF021B47);

                        return Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isTopup
                                    ? const Color(0xFF01A34D).withOpacity(0.06)
                                    : const Color(0xFF0165B7).withOpacity(0.06),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                isTopup ? Icons.add_rounded : Icons.directions_car_rounded,
                                color: isTopup ? const Color(0xFF01A34D) : const Color(0xFF0165B7),
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    tx['description'] as String,
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF021B47), fontSize: 14),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    tx['date'].toString().split('T')[0],
                                    style: const TextStyle(color: Color(0xFF8A94A6), fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '$sign${AppConstants.currencySymbol}${amount.toStringAsFixed(0)}',
                              style: TextStyle(
                                color: amountColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 24),
                    Center(
                      child: TextButton(
                        onPressed: () => context.push('/transactions'),
                        child: const Text(
                          'View All Transactions',
                          style: TextStyle(
                            color: Color(0xFF0165B7),
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          return const LoadingView();
        },
      ),
    );
  }
}
