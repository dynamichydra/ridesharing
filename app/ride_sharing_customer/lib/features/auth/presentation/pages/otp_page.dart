import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../bloc/auth_bloc.dart';

class OtpPage extends StatefulWidget {
  final String phoneNumber;
  const OtpPage({super.key, required this.phoneNumber});

  @override
  State<OtpPage> createState() => _OtpPageState();
}

class _OtpPageState extends State<OtpPage> {
  final _formKey = GlobalKey<FormState>();
  final _otpController = TextEditingController();

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      context.read<AuthBloc>().add(OtpSubmitted(_otpController.text.trim()));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthAuthenticated) {
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
              padding: const EdgeInsets.all(AppSpacing.l),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Verify Phone',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.s),
                    Text(
                      'Enter the 6-digit code sent to ${widget.phoneNumber.isNotEmpty ? widget.phoneNumber : 'your number'}.\n(Hint: Enter 123456)',
                      style: theme.textTheme.bodyMedium?.copyWith(height: 1.5),
                    ),
                    const SizedBox(height: AppSpacing.xxl),
                    CustomTextField(
                      controller: _otpController,
                      labelText: 'Verification Code',
                      hintText: '123456',
                      prefixIcon: Icons.phonelink_lock_rounded,
                      keyboardType: TextInputType.number,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter the verification code';
                        }
                        if (value.length != 6) {
                          return 'Verification code must be 6 digits';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    CustomButton(
                      text: 'Verify & Continue',
                      onPressed: _submit,
                      isLoading: isLoading,
                    ),
                    const SizedBox(height: AppSpacing.l),
                    Center(
                      child: TextButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Mock OTP Code Resent! Check: 123456'),
                            ),
                          );
                        },
                        child: Text(
                          'Resend Code',
                          style: TextStyle(
                            color: theme.colorScheme.secondary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
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
