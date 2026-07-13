import 'package:flutter/material.dart';

class AppLocalizations {
  final Locale locale;
  AppLocalizations(this.locale);

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const Map<String, Map<String, String>> _localizedValues = {
    'en': {
      'welcome_title': 'Earn good money, meet great people',
      'welcome_subtitle': 'Drive in India\'s fastest growing ride sharing network with zero commission.',
      'register_btn': 'Register as Partner',
      'login_btn': 'Already a partner? Login',
      'ready_to_ride': 'Ready to ride? Open the rider app.',
      'enter_phone': 'Enter your mobile number',
      'enter_phone_desc_register': 'Enter your mobile number to get started.',
      'enter_phone_desc_login': 'Enter your registered mobile number to login.',
      'send_otp': 'Send Verification Code',
      'phone_number': 'Phone Number',
      'verify_code': 'Verify code',
      'verify_code_desc': 'We sent a 6-digit code to {phone}. Enter it below.',
      'verify_continue': 'Verify & Continue',
      'resend_code': 'Resend Code',
      'validation_phone': 'Please enter a valid 10-digit number',
      'validation_otp': 'Please enter a valid 6-digit code',
      'verification_steps': 'Verification steps',
      'step_n_of_8': 'Step {step} of 8',
      'login_title': 'Login to Account',
      'register_title': 'Register as Partner',
      'get_started': 'Get started',
      'welcome_aboard': 'Welcome Ryva Ride',
      'enter_number_desc': 'Enter your number to log in.',
      'new_number_find_account': "Don't have an account? Create new",
    },
    'hi': {
      'welcome_title': 'अच्छा पैसा कमाएं, बेहतरीन लोगों से मिलें',
      'welcome_subtitle': 'शून्य कमीशन के साथ भारत के सबसे तेजी से बढ़ते राइड शेयरिंग नेटवर्क में ड्राइव करें।',
      'register_btn': 'पार्टनर के रूप में पंजीकरण करें',
      'login_btn': 'पहले से पार्टनर हैं? लॉगिन करें',
      'ready_to_ride': 'यात्रा के लिए तैयार? राइडर ऐप खोलें।',
      'enter_phone': 'अपना मोबाइल नंबर दर्ज करें',
      'enter_phone_desc_register': 'शुरू करने के लिए अपना मोबाइल नंबर दर्ज करें।',
      'enter_phone_desc_login': 'लॉगिन करने के लिए अपना पंजीकृत मोबाइल नंबर दर्ज करें।',
      'send_otp': 'सत्यापन कोड भेजें',
      'phone_number': 'फ़ोन नंबर',
      'verify_code': 'कोड सत्यापित करें',
      'verify_code_desc': 'हमने {phone} पर 6-अंकीय कोड भेजा है। इसे नीचे दर्ज करें।',
      'verify_continue': 'सत्यापित करें और आगे बढ़ें',
      'resend_code': 'कोड दोबारा भेजें',
      'validation_phone': 'कृपया एक वैध 10-अंकीय नंबर दर्ज करें',
      'validation_otp': 'कृपया एक वैध 6-अंकीय कोड दर्ज करें',
      'verification_steps': 'सत्यापन चरण',
      'step_n_of_8': 'चरण {step} का 8',
      'login_title': 'खाते में लॉगिन करें',
      'register_title': 'पार्टनर के रूप में पंजीकरण',
      'get_started': 'शुरू करें',
      'welcome_aboard': 'राइवा राइड में स्वागत है',
      'enter_number_desc': 'लॉग इन करने के लिए अपना नंबर दर्ज करें।',
      'new_number_find_account': 'खाता नहीं है? नया बनाएं',
    }
  };

  String get welcomeTitle => _localizedValues[locale.languageCode]?['welcome_title'] ?? '';
  String get welcomeSubtitle => _localizedValues[locale.languageCode]?['welcome_subtitle'] ?? '';
  String get registerBtn => _localizedValues[locale.languageCode]?['register_btn'] ?? '';
  String get getStarted => _localizedValues[locale.languageCode]?['get_started'] ?? '';
  String get welcomeAboard => _localizedValues[locale.languageCode]?['welcome_aboard'] ?? '';
  String get enterNumberDesc => _localizedValues[locale.languageCode]?['enter_number_desc'] ?? '';
  String get newNumberFindAccount => _localizedValues[locale.languageCode]?['new_number_find_account'] ?? '';
  String get loginBtn => _localizedValues[locale.languageCode]?['login_btn'] ?? '';
  String get readyToRide => _localizedValues[locale.languageCode]?['ready_to_ride'] ?? '';
  String get enterPhone => _localizedValues[locale.languageCode]?['enter_phone'] ?? '';
  String get enterPhoneDescRegister => _localizedValues[locale.languageCode]?['enter_phone_desc_register'] ?? '';
  String get enterPhoneDescLogin => _localizedValues[locale.languageCode]?['enter_phone_desc_login'] ?? '';
  String get sendOtp => _localizedValues[locale.languageCode]?['send_otp'] ?? '';
  String get phoneNumber => _localizedValues[locale.languageCode]?['phone_number'] ?? '';
  String get verifyCode => _localizedValues[locale.languageCode]?['verify_code'] ?? '';
  String verifyCodeDesc(String phone) => (_localizedValues[locale.languageCode]?['verify_code_desc'] ?? '').replaceAll('{phone}', phone);
  String get verifyContinue => _localizedValues[locale.languageCode]?['verify_continue'] ?? '';
  String get resendCode => _localizedValues[locale.languageCode]?['resend_code'] ?? '';
  String get validationPhone => _localizedValues[locale.languageCode]?['validation_phone'] ?? '';
  String get validationOtp => _localizedValues[locale.languageCode]?['validation_otp'] ?? '';
  String get verificationSteps => _localizedValues[locale.languageCode]?['verification_steps'] ?? '';
  String stepNOf8(int step) => (_localizedValues[locale.languageCode]?['step_n_of_8'] ?? '').replaceAll('{step}', step.toString());
  String get loginTitle => _localizedValues[locale.languageCode]?['login_title'] ?? '';
  String get registerTitle => _localizedValues[locale.languageCode]?['register_title'] ?? '';
}

class AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['en', 'hi'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(AppLocalizationsDelegate old) => false;
}

class LocaleController extends InheritedWidget {
  final Locale locale;
  final Function(String) changeLanguage;

  const LocaleController({
    super.key,
    required this.locale,
    required this.changeLanguage,
    required super.child,
  });

  static LocaleController? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<LocaleController>();
  }

  @override
  bool updateShouldNotify(LocaleController oldWidget) {
    return locale != oldWidget.locale;
  }
}
