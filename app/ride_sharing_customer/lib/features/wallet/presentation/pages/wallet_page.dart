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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ride Sharing Wallet'),
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
                padding: const EdgeInsets.all(AppSpacing.m),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Balance Gradient Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(AppSpacing.l),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppColors.primaryBlue, Color(0xFF1E50C5)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(AppRadius.xl),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primaryBlue.withOpacity(0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Available Balance',
                            style: TextStyle(color: Colors.white70, fontSize: 14),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '${AppConstants.currencySymbol}${state.balance.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 36,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.l),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Default: Visa **** 4242',
                                style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 12),
                              ),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: AppColors.primaryBlue,
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppRadius.m),
                                  ),
                                ),
                                onPressed: () => context.push('/add-funds'),
                                child: const Text(
                                  '+ Add Funds',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // 2. Saved Cards Section
                    Text(
                      'Payment Methods',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: AppSpacing.m),
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.credit_card_rounded, color: AppColors.primaryBlue),
                        title: const Text('Visa ending in 4242'),
                        subtitle: const Text('Expires 12/28'),
                        trailing: const Icon(Icons.check_circle_rounded, color: AppColors.successGreen),
                        onTap: () => context.push('/payment-methods'),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    // 3. Transactions List Section
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Recent Transactions',
                          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        if (state.transactions.length > 4)
                          TextButton(
                            onPressed: () => context.push('/transactions'),
                            child: const Text('View All'),
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.m),

                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: recentTxs.length,
                      separatorBuilder: (context, index) => const Divider(),
                      itemBuilder: (context, index) {
                        final tx = recentTxs[index];
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
                    ),
                  ],
                ),
              ),
            );
          }

          return const Scaffold(body: LoadingView());
        },
      ),
    );
  }
}
