import 'package:flutter/material.dart';
import '../../style/appcolors.dart';

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
  final _otpController = TextEditingController(text: '123456');
  bool _isValid = true;

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
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          const Text(
            'Verify code',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'We sent a 6-digit code to ${widget.phoneNumber}. Enter it below.',
            style: const TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 40),
          TextField(
            controller: _otpController,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              letterSpacing: 12,
            ),
            decoration: InputDecoration(
              labelText: 'Verification Code',
              counterText: '',
              errorText: _isValid ? null : 'Please enter a valid 6-digit code',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onChanged: (val) {
              debugPrint('[OtpVerificationScreen] OTP input changed: $val');
              if (!_isValid && val.length == 6) {
                setState(() {
                  _isValid = true;
                });
              }
            },
          ),
          const SizedBox(height: 24),
          TextButton(
            onPressed: () {
              debugPrint('[OtpVerificationScreen] Resend Code link clicked');
              widget.onResendRequested();
            },
            child: const Text(
              'Resend Code',
              style: TextStyle(
                color: AppColors.secondary,
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
            child: const Text('Verify & Continue'),
          ),
        ],
      ),
    );
  }
}
