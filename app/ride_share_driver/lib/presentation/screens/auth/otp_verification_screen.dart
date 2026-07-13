import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:otp_autofill/otp_autofill.dart';
import '../../../style/appcolors.dart';
import '../../../core/localization/app_localizations.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../widgets/custom_toast.dart';

class OtpVerificationScreen extends StatefulWidget {
  final String phoneNumber;
  final Function(String) onOtpVerified;
  final VoidCallback onResendRequested;

  const OtpVerificationScreen({
    super.key,
    required this.phoneNumber,
    required this.onOtpVerified,
    required this.onResendRequested,
  });

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  late final OTPTextEditController _otpController;
  late final OTPInteractor _otpInteractor;
  bool _isValid = true;
  int _resendCountdown = 30;
  Timer? _timer;
  final _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      setState(() {});
    });
    _otpInteractor = OTPInteractor();
    _otpController = OTPTextEditController(
      codeLength: 6,
      otpInteractor: _otpInteractor,
    );
    if (Platform.isAndroid) {
      _otpController.startListenUserConsent(
        (code) {
          final exp = RegExp(r'(\d{6})');
          return exp.stringMatch(code ?? '') ?? '';
        },
      );
    }
    _otpController.text = '';
    _startTimer();
  }

  void _startTimer() {
    setState(() {
      _resendCountdown = 30;
    });
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_resendCountdown > 0) {
          _resendCountdown--;
        } else {
          _timer?.cancel();
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _focusNode.dispose();
    if (Platform.isAndroid) {
      _otpController.stopListen();
    }
    super.dispose();
  }

  void _submit() {
    final otp = _otpController.text.trim();
    debugPrint('[OtpVerificationScreen] Submit button clicked. Entered OTP: $otp');
    if (otp.length == 6 && RegExp(r'^[0-9]+$').hasMatch(otp)) {
      widget.onOtpVerified(otp);
    } else {
      debugPrint('[OtpVerificationScreen] Validation failed for OTP: $otp');
      setState(() {
        _isValid = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, authState) {
        if (authState is AuthOtpSent) {
          debugPrint('[OtpVerificationScreen] AuthOtpSent received, starting countdown timer.');
          _startTimer();
          CustomToast.show(context, 'OTP resent successfully');
        }
      },
      child: Stack(
        children: [
          // Full screen background image
          Positioned.fill(
            child: Image.asset(
              'assets/images/onboarding_driver.png',
              fit: BoxFit.cover,
            ),
          ),
          // Dark gradient overlay
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.2),
                    Colors.black.withOpacity(0.55),
                    Colors.black.withOpacity(0.9),
                  ],
                  stops: const [0.0, 0.45, 0.9],
                ),
              ),
            ),
          ),
          // Main Content
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.verifyCode,
                      style: const TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.verifyCodeDesc(widget.phoneNumber),
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.white.withOpacity(0.85),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 36),
              // White card container for inputs
              Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(28),
                    topRight: Radius.circular(28),
                  ),
                ),
                padding: EdgeInsets.only(
                  left: 24,
                  right: 24,
                  top: 32,
                  bottom: MediaQuery.of(context).padding.bottom + 24,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
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
                              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                              enableSuggestions: false,
                              autocorrect: false,
                              showCursor: false,
                              decoration: const InputDecoration(
                                counterText: '',
                                border: InputBorder.none,
                              ),
                              onChanged: (val) {
                                debugPrint('[OtpVerificationScreen] OTP input changed: $val');
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

                              return Container(
                                width: 44,
                                height: 52,
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: !_isValid
                                        ? AppColors.error
                                        : isFocused
                                            ? AppColors.secondary
                                            : Colors.grey.shade300,
                                    width: isFocused ? 2 : 1.5,
                                  ),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  char,
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimary,
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
                      Text(
                        l10n.validationOtp,
                        style: const TextStyle(color: AppColors.error, fontSize: 13),
                        textAlign: TextAlign.left,
                      ),
                    ],
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: _resendCountdown > 0 ? null : () {
                        debugPrint('[OtpVerificationScreen] Resend Code link clicked');
                        widget.onResendRequested();
                      },
                      child: Text(
                        _resendCountdown > 0 
                            ? '${l10n.resendCode} (${_resendCountdown}s)'
                            : l10n.resendCode,
                        style: TextStyle(
                          color: _resendCountdown > 0 ? Colors.grey : AppColors.secondary,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () {
                        debugPrint('[OtpVerificationScreen] Verify & Continue button clicked');
                        _submit();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: Text(l10n.verifyContinue),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
