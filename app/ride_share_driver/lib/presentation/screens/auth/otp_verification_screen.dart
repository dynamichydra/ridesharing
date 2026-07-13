import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:otp_autofill/otp_autofill.dart';
import '../../../style/appcolors.dart';
import '../../../core/localization/app_localizations.dart';

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
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          Text(
            l10n.verifyCode,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.verifyCodeDesc(widget.phoneNumber),
            style: const TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 40),
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
                      width: 48,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: !_isValid
                              ? AppColors.error
                              : isFocused
                                  ? AppColors.secondary
                                  : AppColors.border,
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
          const SizedBox(height: 24),
          TextButton(
            onPressed: _resendCountdown > 0 ? null : () {
              debugPrint('[OtpVerificationScreen] Resend Code link clicked');
              widget.onResendRequested();
              _startTimer();
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
          const Spacer(),
          ElevatedButton(
            onPressed: () {
              debugPrint('[OtpVerificationScreen] Verify & Continue button clicked');
              _submit();
            },
            child: Text(l10n.verifyContinue),
          ),
        ],
      ),
    );
  }
}
