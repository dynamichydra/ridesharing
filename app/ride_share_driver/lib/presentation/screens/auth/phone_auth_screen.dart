import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../style/appcolors.dart';
import '../../../core/localization/app_localizations.dart';

class PhoneAuthScreen extends StatefulWidget {
  final Function(String) onPhoneSubmitted;
  final bool isLogin;

  const PhoneAuthScreen({super.key, required this.onPhoneSubmitted, required this.isLogin});

  @override
  State<PhoneAuthScreen> createState() => _PhoneAuthScreenState();
}

class _PhoneAuthScreenState extends State<PhoneAuthScreen> {
  final _phoneController = TextEditingController();
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
    final l10n = AppLocalizations.of(context)!;
    return Stack(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 0.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.welcomeAboard,
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                l10n.enterNumberDesc,
                style: const TextStyle(
                  fontSize: 16,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w400,
                  letterSpacing: 0,
                  color: AppColors.textPrimary,
                ),
                decoration: InputDecoration(
                  hintText: '+91 9876543210',
                  hintStyle: const TextStyle(color: Colors.grey, fontWeight: FontWeight.normal),
                  counterText: '',
                  prefixText: _phoneController.text.isNotEmpty ? '+91 ' : null,
                  prefixStyle: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textPrimary,
                  ),
                  errorText: _isValid ? null : l10n.validationPhone,
                ),
                onChanged: (val) {
                  debugPrint('[PhoneAuthScreen] Phone input changed: $val');
                  setState(() {
                    if (!_isValid && val.length == 10) {
                      _isValid = true;
                    }
                  });
                },
              ),
              const SizedBox(height: 24),
              GestureDetector(
                onTap: () {
                  debugPrint('[PhoneAuthScreen] New number link clicked');
                },
                child: Center(
                  child: Text(
                    l10n.newNumberFindAccount,
                    style: const TextStyle(
                      color: AppColors.secondary,
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                ),
              ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  SizedBox(
                    width: 56,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: () {
                        debugPrint('[PhoneAuthScreen] Circular Next button clicked');
                        _submit();
                      },
                      style: ElevatedButton.styleFrom(
                        shape: const CircleBorder(),
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.zero,
                        elevation: 2,
                      ),
                      child: const Icon(
                        Icons.arrow_forward_rounded,
                        color: Colors.white,
                        size: 26,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
