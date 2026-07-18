import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/custom_button.dart';
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
  final FocusNode _focusNode = FocusNode();
  bool _isValid = true;

  @override
  void dispose() {
    _otpController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _submit() {
    final otp = _otpController.text.trim();
    if (otp.length == 6) {
      setState(() {
        _isValid = true;
      });
      context.read<AuthBloc>().add(OtpSubmitted(otp));
    } else {
      setState(() {
        _isValid = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

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
          if (state is RegistrationDetailsRequired) {
            context.pushReplacement('/signup');
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
                      style: theme.textTheme.bodyMedium?.copyWith(
                        height: 1.5,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),
                    
                    // Stack for PIN boxes
                    Stack(
                      children: [
                        Opacity(
                          opacity: 0.0,
                          child: SizedBox(
                            height: 56,
                            child: TextField(
                              controller: _otpController,
                              focusNode: _focusNode,
                              keyboardType: TextInputType.number,
                              maxLength: 6,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                              ],
                              enableSuggestions: false,
                              autocorrect: false,
                              showCursor: false,
                              decoration: const InputDecoration(
                                counterText: '',
                                border: InputBorder.none,
                              ),
                              onChanged: (val) {
                                setState(() {
                                  if (!_isValid && val.length == 6) {
                                    _isValid = true;
                                  }
                                });
                              },
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: () {
                            _focusNode.requestFocus();
                          },
                           child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: List.generate(6, (index) {
                              final text = _otpController.text;
                              String char = '';
                              if (index < text.length) {
                                char = text[index];
                              }
                              final isFocused = _focusNode.hasFocus && index == text.length;
                              final hasValue = char.isNotEmpty;

                              return Container(
                                width: 46,
                                height: 54,
                                decoration: BoxDecoration(
                                  color: hasValue 
                                      ? AppColors.secondaryBlue.withOpacity(0.08) 
                                      : isDark ? AppColors.darkSurface : Colors.grey.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: !_isValid
                                        ? AppColors.errorRed
                                        : isFocused
                                            ? AppColors.primaryBlue
                                            : hasValue
                                                ? AppColors.secondaryBlue
                                                : isDark ? AppColors.darkDivider : Colors.grey.shade300,
                                    width: (isFocused || hasValue) ? 2 : 1.5,
                                  ),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  char,
                                  style: TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    color: hasValue
                                        ? AppColors.secondaryBlue
                                        : isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                  ),
                                ),
                              );
                            }),
                          ),
                        ),
                      ],
                    ),
                    if (!_isValid) ...[
                      const SizedBox(height: 8),
                      const Text(
                        'Please enter a valid 6-digit code',
                        style: TextStyle(
                          color: AppColors.errorRed,
                          fontSize: 13,
                        ),
                        textAlign: TextAlign.left,
                      ),
                    ],
                    
                    const SizedBox(height: AppSpacing.xl * 1.5),
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
                        child: const Text(
                          'Resend Code',
                          style: TextStyle(
                            color: AppColors.primaryBlue,
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
