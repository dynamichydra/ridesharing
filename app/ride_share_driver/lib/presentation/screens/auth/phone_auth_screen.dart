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
                    l10n.welcomeAboard,
                    style: const TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.enterNumberDesc,
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
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    maxLength: 10,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 1,
                      color: AppColors.textPrimary,
                    ),
                    decoration: InputDecoration(
                      hintText: '+91-9876543210',
                      hintStyle: const TextStyle(color: Colors.grey, fontWeight: FontWeight.normal, letterSpacing: 0),
                      counterText: '',
                      prefixText: _phoneController.text.isNotEmpty ? '+91 ' : null,
                      prefixStyle: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                      errorText: _isValid ? null : l10n.validationPhone,
                      filled: true,
                      fillColor: Colors.grey.shade50,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.secondary, width: 2),
                      ),
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
                  const SizedBox(height: 20),
                  GestureDetector(
                    onTap: () {
                      debugPrint('[PhoneAuthScreen] New number link clicked');
                    },
                    child: Text(
                      l10n.newNumberFindAccount,
                      style: const TextStyle(
                        color: AppColors.secondary,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 28),
                  ElevatedButton(
                    onPressed: () {
                      debugPrint('[PhoneAuthScreen] Continue button clicked');
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
                    child: Text(
                      l10n.getStarted,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}
