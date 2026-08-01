import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
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
  Timer? _timer;
  int _secondsRemaining = 28;

  @override
  void initState() {
    super.initState();
    _startTimer();
    // Auto focus the OTP input
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() {
      _secondsRemaining = 28;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining == 0) {
        setState(() {
          _timer?.cancel();
        });
      } else {
        setState(() {
          _secondsRemaining--;
        });
      }
    });
  }

  void _resendOtp() {
    _startTimer();
    if (widget.phoneNumber.isNotEmpty) {
      context.read<AuthBloc>().add(LoginSubmitted(widget.phoneNumber));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('OTP resent successfully'),
          backgroundColor: Color(0xFF009048),
        ),
      );
    }
  }

  @override
  void dispose() {
    _otpController.dispose();
    _focusNode.dispose();
    _timer?.cancel();
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
    return Scaffold(
      backgroundColor: Colors.white,
      resizeToAvoidBottomInset: false,
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthAuthenticated) {
            context.go('/home');
          } else if (state is RegistrationDetailsRequired) {
            context.go('/onboarding');
          } else if (state is AuthError) {
            setState(() {
              _isValid = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.errorRed,
              ),
            );
          }
        },
        builder: (context, state) {
          final isLoading = state is AuthLoading;

          return Stack(
            children: [
              // Bottom curves decoration
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Image.asset(
                  'assets/images/bottom-section-otp-page.png',
                  fit: BoxFit.fitWidth,
                ),
              ),
              SafeArea(
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Back Arrow Button
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                        child: IconButton(
                          icon: const Icon(
                            Icons.arrow_back_rounded,
                            color: Color(0xFF009048), // Brand Green
                            size: 28,
                          ),
                          onPressed: () => context.pop(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Phone Logo Illustration
                      Center(
                        child: Image.asset(
                          'assets/images/otp-logo.png',
                          height: 160,
                          fit: BoxFit.contain,
                        ),
                      ),
                      const SizedBox(height: 32),
                      // Title Section
                      Center(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Text(
                              'Verify ',
                              style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF009048), // Brand Green
                              ),
                            ),
                            Text(
                              'your number',
                              style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0A2540), // Dark Navy
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Subtitle
                      Center(
                        child: Text(
                          'Enter the 6-digit code sent to',
                          style: TextStyle(
                            fontSize: 16,
                            color: const Color(0xFF4A5568).withOpacity(0.8),
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Center(
                        child: Text(
                          widget.phoneNumber.isNotEmpty ? widget.phoneNumber : "+91 98765 43210",
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF009048),
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
                      // PIN Input Code Blocks
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24.0),
                        child: Stack(
                          children: [
                            // Invisible Text Field taking focus input
                            Opacity(
                              opacity: 0.0,
                              child: SizedBox(
                                height: 56,
                                child: TextField(
                                  controller: _otpController,
                                  focusNode: _focusNode,
                                  keyboardType: TextInputType.number,
                                  maxLength: 6,
                                  enabled: !isLoading,
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
                                    if (!_isValid) {
                                      setState(() {
                                        _isValid = true;
                                      });
                                    }
                                    if (val.length == 6) {
                                      _submit();
                                    }
                                  },
                                ),
                              ),
                            ),
                            // Displays the actual code UI boxes
                            GestureDetector(
                              onTap: () => _focusNode.requestFocus(),
                              child: ValueListenableBuilder<TextEditingValue>(
                                valueListenable: _otpController,
                                builder: (context, value, _) {
                                  final text = value.text;
                                  return Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: List.generate(6, (index) {
                                      String char = '';
                                      if (index < text.length) {
                                        char = text[index];
                                      }
                                      final isFocused = _focusNode.hasFocus && index == text.length;
                                      final hasValue = char.isNotEmpty;

                                      return Container(
                                        width: 48,
                                        height: 56,
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(12),
                                          border: Border.all(
                                            color: !_isValid
                                                ? const Color(0xFFE53935)
                                                : isFocused
                                                    ? const Color(0xFF009048)
                                                    : const Color(0xFFE2E8F0),
                                            width: isFocused ? 2 : 1.5,
                                          ),
                                        ),
                                        alignment: Alignment.center,
                                        child: isLoading && index == text.length - 1
                                            ? const SizedBox(
                                                width: 20,
                                                height: 20,
                                                child: CircularProgressIndicator(
                                                  strokeWidth: 2,
                                                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF009048)),
                                                ),
                                              )
                                            : isFocused
                                                ? const Text(
                                                    '|',
                                                    style: TextStyle(
                                                      fontSize: 20,
                                                      color: Color(0xFF009048),
                                                      fontWeight: FontWeight.w300,
                                                    ),
                                                  )
                                                : Text(
                                                    hasValue ? char : '-',
                                                    style: TextStyle(
                                                      fontSize: 20,
                                                      fontWeight: FontWeight.bold,
                                                      color: hasValue ? const Color(0xFF009048) : const Color(0xFF94A3B8),
                                                    ),
                                                  ),
                                      );
                                    }),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (!_isValid) ...[
                        const SizedBox(height: 8),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 24.0),
                          child: Text(
                            'Please enter a valid 6-digit code',
                            style: TextStyle(
                              color: Color(0xFFE53935),
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 32),
                      // Resend code countdown text
                      Center(
                        child: Column(
                          children: [
                            const Text(
                              "Didn't receive the code?",
                              style: TextStyle(
                                fontSize: 14,
                                color: Color(0xFF4A5568),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            _secondsRemaining > 0
                                ? Text(
                                    'Resend OTP (00:${_secondsRemaining.toString().padLeft(2, '0')})',
                                    style: const TextStyle(
                                      color: Color(0xFF94A3B8),
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  )
                                : TextButton(
                                    onPressed: _resendOtp,
                                    child: const Text(
                                      'Resend OTP',
                                      style: TextStyle(
                                        color: Color(0xFF009048),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                      // Safe verification shield banner
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24.0),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFF1F5F9)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF009048).withOpacity(0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.verified_user_rounded,
                                  color: Color(0xFF009048),
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: const [
                                    Text(
                                      'Your verification is safe',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0A2540),
                                        fontSize: 14,
                                      ),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      'We use bank-level security to protect your information.',
                                      style: TextStyle(
                                        color: Color(0xFF718096),
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
