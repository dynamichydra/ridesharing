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
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (sheetContext) => BlocProvider.value(
                            value: context.read<ProfileBloc>(),
                            child: const _AddCardBottomSheet(),
                          ),
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

class _AddCardBottomSheet extends StatefulWidget {
  const _AddCardBottomSheet();

  @override
  State<_AddCardBottomSheet> createState() => _AddCardBottomSheetState();
}

class _AddCardBottomSheetState extends State<_AddCardBottomSheet> {
  final _formKey = GlobalKey<FormState>();
  final _cardNumberController = TextEditingController();
  final _expiryController = TextEditingController();
  final _cvvController = TextEditingController();
  final _nameController = TextEditingController();
  String _cardBrand = 'Card';

  @override
  void dispose() {
    _cardNumberController.dispose();
    _expiryController.dispose();
    _cvvController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _submit(BuildContext context) {
    if (_formKey.currentState!.validate()) {
      final bloc = context.read<ProfileBloc>();
      final state = bloc.state;
      if (state is ProfileLoaded) {
        final rawMethods = state.userProfile['payment_methods'] as List? ?? [];
        final currentMethods = rawMethods.map((e) => Map<String, dynamic>.from(e as Map)).toList();

        final cardNo = _cardNumberController.text.replaceAll(' ', '');
        final last4 = cardNo.length >= 4 ? cardNo.substring(cardNo.length - 4) : '0000';

        final newMethod = {
          'id': 'pm_${DateTime.now().millisecondsSinceEpoch}',
          'type': 'credit_card',
          'brand': _cardBrand,
          'last_4': last4,
          'expiry': _expiryController.text,
          'is_default': currentMethods.isEmpty,
        };

        final updated = [...currentMethods, newMethod];
        bloc.add(UpdatePaymentMethods(updated));
        
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$_cardBrand ending in $last4 added successfully!'),
            backgroundColor: AppColors.successGreen,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(AppRadius.xl),
          topRight: Radius.circular(AppRadius.xl),
        ),
      ),
      padding: EdgeInsets.only(
        left: AppSpacing.l,
        right: AppSpacing.l,
        top: AppSpacing.l,
        bottom: AppSpacing.l + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.grey[700] : Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.m),
              Text(
                'Add Credit or Debit Card',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.m),

              // Visual Premium Card
              Container(
                width: double.infinity,
                height: 170,
                padding: const EdgeInsets.all(AppSpacing.l),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark 
                        ? [const Color(0xFF2C2C35), const Color(0xFF1E1E24)] 
                        : [AppColors.primaryBlue, const Color(0xFF1E50C5)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(AppRadius.l),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.15),
                      blurRadius: 10,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Icon(Icons.nfc_rounded, color: Colors.white70, size: 28),
                        Text(
                          _cardBrand.toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      _cardNumberController.text.isNotEmpty 
                          ? _cardNumberController.text 
                          : '•••• •••• •••• ••••',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        letterSpacing: 2,
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'CARDHOLDER',
                              style: TextStyle(color: Colors.white54, fontSize: 8, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _nameController.text.isNotEmpty 
                                  ? _nameController.text.toUpperCase() 
                                  : 'YOUR NAME',
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'EXPIRES',
                              style: TextStyle(color: Colors.white54, fontSize: 8, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _expiryController.text.isNotEmpty 
                                  ? _expiryController.text 
                                  : 'MM/YY',
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.l),

              // Fields
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Cardholder Name',
                  prefixIcon: Icon(Icons.person_outline_rounded),
                ),
                textCapitalization: TextCapitalization.characters,
                validator: (val) => val == null || val.isEmpty ? 'Please enter cardholder name' : null,
                onChanged: (val) => setState(() {}),
              ),
              const SizedBox(height: AppSpacing.s),
              TextFormField(
                controller: _cardNumberController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Card Number',
                  prefixIcon: Icon(Icons.credit_card_rounded),
                  hintText: '4111 2222 3333 4444',
                ),
                validator: (val) {
                  if (val == null || val.replaceAll(' ', '').length < 16) {
                    return 'Please enter 16 digits';
                  }
                  return null;
                },
                onChanged: (value) {
                  String clean = value.replaceAll(' ', '');
                  if (clean.length > 16) clean = clean.substring(0, 16);
                  
                  String formatted = '';
                  for (int i = 0; i < clean.length; i++) {
                    if (i > 0 && i % 4 == 0) {
                      formatted += ' ';
                    }
                    formatted += clean[i];
                  }
                  
                  if (formatted != value) {
                    _cardNumberController.value = TextEditingValue(
                      text: formatted,
                      selection: TextSelection.collapsed(offset: formatted.length),
                    );
                  }
                  
                  setState(() {
                    if (clean.startsWith('4')) {
                      _cardBrand = 'Visa';
                    } else if (clean.startsWith('5')) {
                      _cardBrand = 'Mastercard';
                    } else if (clean.startsWith('3')) {
                      _cardBrand = 'Amex';
                    } else {
                      _cardBrand = 'Card';
                    }
                  });
                },
              ),
              const SizedBox(height: AppSpacing.s),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _expiryController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Expiry Date',
                        prefixIcon: Icon(Icons.calendar_today_rounded),
                        hintText: 'MM/YY',
                      ),
                      validator: (val) {
                        if (val == null || !val.contains('/') || val.length < 5) {
                          return 'Enter MM/YY';
                        }
                        return null;
                      },
                      onChanged: (value) {
                        String clean = value.replaceAll('/', '');
                        if (clean.length > 4) clean = clean.substring(0, 4);
                        
                        String formatted = '';
                        for (int i = 0; i < clean.length; i++) {
                          if (i == 2) {
                            formatted += '/';
                          }
                          formatted += clean[i];
                        }
                        
                        if (formatted != value) {
                          _expiryController.value = TextEditingValue(
                            text: formatted,
                            selection: TextSelection.collapsed(offset: formatted.length),
                          );
                        }
                        setState(() {});
                      },
                    ),
                  ),
                  const SizedBox(width: AppSpacing.s),
                  Expanded(
                    child: TextFormField(
                      controller: _cvvController,
                      keyboardType: TextInputType.number,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'CVV',
                        prefixIcon: Icon(Icons.lock_outline_rounded),
                        hintText: '•••',
                      ),
                      validator: (val) => val == null || val.length < 3 ? 'Enter CVV' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.l),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.colorScheme.primary,
                    foregroundColor: theme.colorScheme.onPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: () => _submit(context),
                  child: const Text('Add Card', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
