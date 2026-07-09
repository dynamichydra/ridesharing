import 'package:flutter/material.dart';
import '../../style/appcolors.dart';

class PhoneAuthScreen extends StatefulWidget {
  final Function(String) onPhoneSubmitted;

  const PhoneAuthScreen({super.key, required this.onPhoneSubmitted});

  @override
  State<PhoneAuthScreen> createState() => _PhoneAuthScreenState();
}

class _PhoneAuthScreenState extends State<PhoneAuthScreen> {
  final _phoneController = TextEditingController(text: '9876543211');
  bool _isValid = true;

  void _submit() {
    final phone = _phoneController.text.trim();
    debugPrint('[PhoneAuthScreen] Submit button clicked. Entered phone: $phone');
    if (phone.length == 10 && RegExp(r'^[0-9]+$').hasMatch(phone)) {
      widget.onPhoneSubmitted('+91$phone');
    } else {
      debugPrint('[PhoneAuthScreen] Validation failed for phone number: $phone');
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
            'Enter your mobile number',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'We will send a 6-digit verification code to confirm your device.',
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 40),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Text(
                      '🇮🇳',
                      style: TextStyle(fontSize: 20),
                    ),
                    SizedBox(width: 8),
                    Text(
                      '+91',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  maxLength: 10,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1.5),
                  decoration: InputDecoration(
                    labelText: 'Phone Number',
                    counterText: '',
                    errorText: _isValid ? null : 'Please enter a valid 10-digit number',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onChanged: (val) {
                    debugPrint('[PhoneAuthScreen] Phone input changed: $val');
                    if (!_isValid && val.length == 10) {
                      setState(() {
                        _isValid = true;
                      });
                    }
                  },
                ),
              ),
            ],
          ),
          const Spacer(),
          ElevatedButton(
            onPressed: () {
              debugPrint('[PhoneAuthScreen] Send Verification Code button clicked');
              _submit();
            },
            child: const Text('Send Verification Code'),
          ),
        ],
      ),
    );
  }
}
