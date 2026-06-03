import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/empty_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../bloc/wallet_bloc.dart';

class TransactionsPage extends StatelessWidget {
  const TransactionsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: const Text('Transaction History'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocBuilder<WalletBloc, WalletState>(
        builder: (context, state) {
          if (state is WalletLoading) {
            return const LoadingView();
          }

          if (state is WalletLoaded) {
            final txs = state.transactions;

            if (txs.isEmpty) {
              return const EmptyView(
                title: 'No Transactions',
                message: 'Your wallet transactions will appear here.',
                icon: Icons.receipt_long_rounded,
              );
            }

            return ListView.separated(
              itemCount: txs.length,
              padding: const EdgeInsets.all(AppSpacing.m),
              separatorBuilder: (context, index) => const Divider(),
              itemBuilder: (context, index) {
                final tx = txs[index];
                final isTopup = tx['type'] == 'topup';
                final amount = (tx['amount'] as num).toDouble();
                final String sign = isTopup ? '+' : '-';
                final Color amountColor = isTopup ? AppColors.successGreen : (isDark ? Colors.white : Colors.black);

                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    padding: const EdgeInsets.all(AppSpacing.s),
                    decoration: BoxDecoration(
                      color: isTopup
                          ? AppColors.successGreen.withOpacity(0.1)
                          : AppColors.primaryBlue.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isTopup ? Icons.add_rounded : Icons.directions_car_rounded,
                      color: isTopup ? AppColors.successGreen : AppColors.primaryBlue,
                    ),
                  ),
                  title: Text(
                    tx['description'] as String,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(
                    tx['date'].toString().split('T')[0],
                    style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                  ),
                  trailing: Text(
                    '$sign${AppConstants.currencySymbol}${amount.toStringAsFixed(2)}',
                    style: TextStyle(
                      color: amountColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                );
              },
            );
          }

          return const Center(child: CircularProgressIndicator());
        },
      ),
    );
  }
}
