import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../../../../injection_container.dart';
import '../bloc/auth_bloc.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  CountryConfig _selectedCountry = CountryConfig.supportedCountries.first;

  @override
  void initState() {
    super.initState();
    try {
      final savedCode = sl<StorageService>().getCountryCode();
      final index = CountryConfig.supportedCountries.indexWhere(
        (c) => c.isoCode == savedCode,
      );
      if (index != -1) {
        _selectedCountry = CountryConfig.supportedCountries[index];
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      final input = _phoneController.text.trim();
      String phone = input;
      if (!phone.startsWith('+')) {
        String digits = input.replaceAll(RegExp(r'\D'), '');
        if (digits.startsWith('0')) {
          digits = digits.substring(1);
        }
        phone = '${_selectedCountry.dialCode}$digits';
      }
      // Bypass AuthBloc API call and go directly to OTP page
      context.push('/otp', extra: phone);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is OtpRequired) {
            context.push('/otp', extra: state.phoneNumber);
          } else if (state is AuthAuthenticated) {
            context.go('/home');
          } else if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: theme.colorScheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          final isLoading = state is AuthLoading;

          return SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.l,
                vertical: AppSpacing.xl,
              ),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Image.asset(
                        'assets/images/ride-share-text-icon.png',
                        height: 48,
                        fit: BoxFit.contain,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl * 1.5),
                    Center(
                      child: Text(
                        'Rider App',
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: isDark
                              ? AppColors.darkTextPrimary
                              : AppColors.lightTextPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.s),
                    Center(
                      child: Text(
                        'Enter your phone number to get started',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: isDark
                              ? AppColors.darkTextSecondary
                              : AppColors.lightTextSecondary,
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),
                    DropdownButtonFormField<CountryConfig>(
                      value: _selectedCountry,
                      decoration: InputDecoration(
                        labelText: 'Select Country',
                        prefixIcon: const Icon(
                          Icons.public_rounded,
                          color: AppColors.primaryBlue,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.m),
                        ),
                      ),
                      items: CountryConfig.supportedCountries.map((c) {
                        return DropdownMenuItem<CountryConfig>(
                          value: c,
                          child: Text('${c.name} (${c.dialCode})'),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedCountry = val;
                          });
                          try {
                            final storage = sl<StorageService>();
                            storage.setCountryCode(val.isoCode);
                            AppConstants.currencySymbol = val.currencySymbol;
                          } catch (_) {}
                        }
                      },
                    ),
                    const SizedBox(height: AppSpacing.m),
                    CustomTextField(
                      controller: _phoneController,
                      labelText: 'Phone Number',
                      hintText: _selectedCountry.isoCode == 'IN'
                          ? '98765 43210'
                          : '555-0199',
                      prefixIcon: Icons.phone_android_rounded,
                      keyboardType: TextInputType.phone,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your phone number';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    CustomButton(
                      text: 'Send Verification Code',
                      onPressed: _submit,
                      isLoading: isLoading,
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
