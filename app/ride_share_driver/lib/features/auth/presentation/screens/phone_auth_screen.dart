import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../style/appcolors.dart';
import '../../../../core/localization/app_localizations.dart';

class _CountryCode {
  final String name;
  final String code;
  final String dialCode;
  final String flag;

  const _CountryCode({
    required this.name,
    required this.code,
    required this.dialCode,
    required this.flag,
  });
}

const List<_CountryCode> _countries = [
  _CountryCode(name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳'),
  _CountryCode(name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦'),
];

class PhoneAuthScreen extends StatefulWidget {
  final Function(String) onPhoneSubmitted;
  final bool isLogin;
  final Function(bool)? onLoginModeChanged;
  final String? initialPhone;

  const PhoneAuthScreen({
    super.key,
    required this.onPhoneSubmitted,
    required this.isLogin,
    this.onLoginModeChanged,
    this.initialPhone,
  });

  @override
  State<PhoneAuthScreen> createState() => _PhoneAuthScreenState();
}

class _PhoneAuthScreenState extends State<PhoneAuthScreen> {
  late final TextEditingController _phoneController;
  bool _isValid = true;
  _CountryCode _selectedCountry = _countries[0];

  @override
  void initState() {
    super.initState();
    String p = widget.initialPhone ?? '';
    for (final c in _countries) {
      if (p.startsWith(c.dialCode)) {
        _selectedCountry = c;
        p = p.substring(c.dialCode.length);
        break;
      }
    }
    _phoneController = TextEditingController(text: p);
  }

  void _submit() {
    final phone = _phoneController.text.trim();
    if (phone.length == 10 && RegExp(r'^[0-9]+$').hasMatch(phone)) {
      widget.onPhoneSubmitted('${_selectedCountry.dialCode}$phone');
    } else {
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
                    widget.isLogin ? l10n.loginTitle : l10n.registerTitle,
                    style: const TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.isLogin
                        ? l10n.enterPhoneDescLogin
                        : l10n.enterPhoneDescRegister,
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
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 52, // Matches content layout
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _isValid
                                ? Colors.grey.shade200
                                : Colors.redAccent,
                          ),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<_CountryCode>(
                            value: _selectedCountry,
                            icon: const Icon(
                              Icons.arrow_drop_down,
                              color: AppColors.textSecondary,
                            ),
                            onChanged: (newValue) {
                              if (newValue != null) {
                                setState(() {
                                  _selectedCountry = newValue;
                                });
                              }
                            },
                            items: _countries.map((c) {
                              return DropdownMenuItem<_CountryCode>(
                                value: c,
                                child: Text(
                                  '${c.flag} ${c.code} (${c.dialCode})',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          maxLength: 10,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                          ],
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 1,
                            color: AppColors.textPrimary,
                          ),
                          decoration: InputDecoration(
                            hintText: '98765 43210',
                            hintStyle: const TextStyle(
                              color: Colors.grey,
                              fontWeight: FontWeight.normal,
                              letterSpacing: 0,
                            ),
                            counterText: '',
                            errorText: _isValid ? null : l10n.validationPhone,
                            filled: true,
                            fillColor: Colors.grey.shade50,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 14,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(
                                color: Colors.grey.shade300,
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(
                                color: Colors.grey.shade200,
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                color: AppColors.secondary,
                                width: 2,
                              ),
                            ),
                          ),
                          onChanged: (val) {
                            setState(() {
                              if (!_isValid && val.length == 10) {
                                _isValid = true;
                              }
                            });
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  GestureDetector(
                    onTap: () {
                      if (widget.onLoginModeChanged != null) {
                        widget.onLoginModeChanged!(!widget.isLogin);
                      }
                    },
                    child: Text(
                      widget.isLogin
                          ? l10n.newNumberFindAccount
                          : l10n.loginBtn,
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
                    onPressed: _submit,
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
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
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
