import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/loading_view.dart';
import '../bloc/profile_bloc.dart';

class PaymentMethodsPage extends StatefulWidget {
  const PaymentMethodsPage({super.key});

  @override
  State<PaymentMethodsPage> createState() => _PaymentMethodsPageState();
}

class _PaymentMethodsPageState extends State<PaymentMethodsPage> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: const Text('Payment Methods'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocBuilder<ProfileBloc, ProfileState>(
        builder: (context, state) {
          if (state is ProfileLoading) {
            return const LoadingView();
          }

          if (state is ProfileLoaded) {
            final profile = state.userProfile;
            final rawMethods = profile['payment_methods'] as List? ?? [];
            final methods = rawMethods.map((e) => Map<String, dynamic>.from(e as Map)).toList();

            return SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.m),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Saved Accounts',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: AppSpacing.m),
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: methods.length,
                    separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.s),
                    itemBuilder: (context, index) {
                      final pm = methods[index];
                      final isDefault = pm['is_default'] as bool? ?? false;

                      IconData icon = Icons.credit_card_rounded;
                      if (pm['type'] == 'apple_pay') icon = Icons.apple_rounded;
                      if (pm['type'] == 'cash') icon = Icons.money_rounded;

                      String title = pm['brand'] as String;
                      if (pm['last_4'].toString().isNotEmpty) {
                        title += ' •••• ${pm['last_4']}';
                      }

                      return Card(
                        child: ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(AppSpacing.s),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.grey[850] : Colors.grey[100],
                              shape: BoxShape.circle,
                            ),
                            child: Icon(icon, color: AppColors.primaryBlue),
                          ),
                          title: Text(
                            title,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(isDefault ? 'Default Payment Method' : 'Tap to set as default'),
                          trailing: isDefault
                              ? const Icon(Icons.check_circle_rounded, color: AppColors.successGreen)
                              : null,
                          onTap: () {
                            if (!isDefault) {
                              final updated = methods.map((e) {
                                return {
                                  ...e,
                                  'is_default': e['id'] == pm['id'],
                                };
                              }).toList();
                              
                              // Save back in ProfileBloc
                              context.read<ProfileBloc>().add(UpdatePaymentMethods(updated));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('$title is now default.')),
                              );
                            }
                          },
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  Text(
                    'Add Payment Option',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: AppSpacing.m),
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.add_rounded, color: AppColors.primaryBlue),
                      title: const Text('Add Credit or Debit Card'),
                      subtitle: const Text('Secure payment processing'),
                      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Credit card integration modal shown (Mocked).')),
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          }

          return const Center(child: CircularProgressIndicator());
        },
      ),
    );
  }
}
