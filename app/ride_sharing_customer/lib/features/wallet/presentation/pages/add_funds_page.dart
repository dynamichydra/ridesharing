import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../bloc/wallet_bloc.dart';
import '../../../profile/presentation/bloc/profile_bloc.dart';

class AddFundsPage extends StatefulWidget {
  const AddFundsPage({super.key});

  @override
  State<AddFundsPage> createState() => _AddFundsPageState();
}

class _AddFundsPageState extends State<AddFundsPage> {
  final _amountController = TextEditingController(text: '500');
  double _selectedAmount = 500.0;
  Map<String, dynamic>? _selectedPaymentMethod;
  bool _selectedPaymentMethodInitialized = false;

  final List<double> _presets = [200.0, 500.0, 1000.0, 2000.0];

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _submit() {
    final double? amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid positive amount.')),
      );
      return;
    }
    
    context.read<WalletBloc>().add(
          AddWalletFunds(
            amount: amount,
            paymentMethodId: _selectedPaymentMethod?['id'] ?? 'pm_visa',
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: const Text('Add Funds'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocConsumer<WalletBloc, WalletState>(
        listener: (context, state) {
          if (state is AddFundsSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Funds added successfully!'),
                backgroundColor: AppColors.successGreen,
              ),
            );
            context.pop();
          } else if (state is WalletError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: theme.colorScheme.error,
              ),
            );
          }
        },
        builder: (context, walletState) {
          final isLoading = walletState is WalletLoading;

          return BlocBuilder<ProfileBloc, ProfileState>(
            builder: (context, profileState) {
              if (profileState is ProfileInitial) {
                context.read<ProfileBloc>().add(LoadProfile());
              }

              if (profileState is ProfileLoaded) {
                final rawMethods = profileState.userProfile['payment_methods'] as List? ?? [];
                final methods = rawMethods.map((e) => Map<String, dynamic>.from(e as Map)).toList();

                if (!_selectedPaymentMethodInitialized && methods.isNotEmpty) {
                  final defaultMethod = methods.firstWhere(
                    (m) => m['is_default'] == true,
                    orElse: () => methods.first,
                  );
                  _selectedPaymentMethod = defaultMethod;
                  _selectedPaymentMethodInitialized = true;
                }

                return SafeArea(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.l),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Enter Amount',
                          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: AppSpacing.m),
                        CustomTextField(
                          controller: _amountController,
                          labelText: 'Amount (${AppConstants.currencySymbol})',
                          prefixIcon: Icons.currency_rupee_rounded,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          onChanged: (val) {
                            setState(() {
                              _selectedAmount = double.tryParse(val) ?? 0.0;
                            });
                          },
                        ),
                        const SizedBox(height: AppSpacing.l),
                        
                        // Presets Row
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: _presets.map((preset) {
                            final isSelected = _selectedAmount == preset;
                            return Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _selectedAmount = preset;
                                    _amountController.text = preset.toStringAsFixed(0);
                                  });
                                },
                                child: Container(
                                  height: 48,
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.primaryBlue
                                        : (isDark ? AppColors.darkSurface : Colors.white),
                                    borderRadius: BorderRadius.circular(AppRadius.m),
                                    border: Border.all(
                                      color: isSelected ? AppColors.primaryBlue : (isDark ? Colors.transparent : Colors.grey[300]!),
                                    ),
                                  ),
                                  child: Center(
                                    child: Text(
                                      '${AppConstants.currencySymbol}${preset.toStringAsFixed(0)}',
                                      style: TextStyle(
                                        color: isSelected ? Colors.white : (isDark ? Colors.white : Colors.black),
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: AppSpacing.xxl),

                        // Funding Source Card
                        Text(
                          'Payment Source',
                          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: AppSpacing.m),
                        Card(
                          child: _selectedPaymentMethod != null
                              ? ListTile(
                                  leading: const Icon(Icons.credit_card_rounded, color: AppColors.primaryBlue),
                                  title: Text('${_selectedPaymentMethod!['brand']} ending in ${_selectedPaymentMethod!['last_4']}'),
                                  subtitle: Text('Expires ${_selectedPaymentMethod!['expiry']}'),
                                  trailing: const Icon(Icons.keyboard_arrow_down_rounded, size: 24),
                                  onTap: () {
                                    showModalBottomSheet(
                                      context: context,
                                      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
                                      shape: const RoundedRectangleBorder(
                                        borderRadius: BorderRadius.only(
                                          topLeft: Radius.circular(AppRadius.xl),
                                          topRight: Radius.circular(AppRadius.xl),
                                        ),
                                      ),
                                      builder: (sheetContext) => Container(
                                        padding: const EdgeInsets.all(AppSpacing.l),
                                        child: Column(
                                          mainAxisSize: MainAxisSize.min,
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Center(
                                              child: Text(
                                                'Select Payment Source',
                                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                              ),
                                            ),
                                            const SizedBox(height: AppSpacing.m),
                                            const Divider(),
                                            ...methods.map((pm) {
                                              final brand = pm['brand'] as String;
                                              final last4 = pm['last_4'] as String;
                                              final isSelected = _selectedPaymentMethod?['id'] == pm['id'];

                                              IconData pmIcon = Icons.credit_card_rounded;
                                              if (pm['type'] == 'apple_pay') pmIcon = Icons.apple_rounded;
                                              if (pm['type'] == 'cash') pmIcon = Icons.money_rounded;

                                              return ListTile(
                                                leading: Container(
                                                  padding: const EdgeInsets.all(AppSpacing.s),
                                                  decoration: BoxDecoration(
                                                    color: isDark ? Colors.grey[850] : Colors.grey[100],
                                                    shape: BoxShape.circle,
                                                  ),
                                                  child: Icon(pmIcon, color: AppColors.primaryBlue),
                                                ),
                                                title: Text('$brand ending in $last4'),
                                                subtitle: Text('Expires ${pm['expiry']}'),
                                                trailing: isSelected
                                                    ? const Icon(Icons.check_circle_rounded, color: AppColors.successGreen)
                                                    : null,
                                                onTap: () {
                                                  setState(() {
                                                    _selectedPaymentMethod = pm;
                                                  });
                                                  Navigator.pop(sheetContext);
                                                },
                                              );
                                            }).toList(),
                                            const SizedBox(height: AppSpacing.m),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                )
                              : ListTile(
                                  leading: const Icon(Icons.add_rounded, color: AppColors.primaryBlue),
                                  title: const Text('Add Payment Method'),
                                  subtitle: const Text('Configure a funding source'),
                                  trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                                  onTap: () => context.push('/payment-methods'),
                                ),
                        ),

                        const SizedBox(height: AppSpacing.xxl),
                        CustomButton(
                          text: 'Add ${AppConstants.currencySymbol}${_selectedAmount.toStringAsFixed(2)}',
                          onPressed: _submit,
                          isLoading: isLoading,
                        ),
                      ],
                    ),
                  ),
                );
              }

              return const Center(child: CircularProgressIndicator());
            },
          );
        },
      ),
    );
  }
}
