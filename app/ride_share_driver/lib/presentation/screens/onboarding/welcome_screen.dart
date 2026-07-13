import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import '../../../core/localization/app_localizations.dart';

class LanguageToggle extends StatelessWidget {
  const LanguageToggle({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = LocaleController.of(context);
    if (controller == null) return const SizedBox.shrink();
    final currentLang = controller.locale.languageCode == 'hi' ? 'हिंदी' : 'English';

    return Theme(
      data: Theme.of(context).copyWith(
        cardColor: Colors.white,
      ),
      child: PopupMenuButton<String>(
        onSelected: (langCode) {
          controller.changeLanguage(langCode);
        },
        itemBuilder: (BuildContext context) => [
          const PopupMenuItem<String>(
            value: 'en',
            child: Text('English', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
          ),
          const PopupMenuItem<String>(
            value: 'hi',
            child: Text('हिंदी', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
          ),
        ],
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.language_rounded,
                size: 16,
                color: Colors.black87,
              ),
              const SizedBox(width: 6),
              Text(
                currentLang,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(width: 4),
              const Icon(
                Icons.keyboard_arrow_down_rounded,
                size: 16,
                color: Colors.black87,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class WelcomeScreen extends StatelessWidget {
  final VoidCallback onRegister;
  final VoidCallback onLogin;

  const WelcomeScreen({super.key, required this.onRegister, required this.onLogin});

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
        // Dark gradient overlay to ensure text readability
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withOpacity(0.1),
                  Colors.black.withOpacity(0.4),
                  Colors.black.withOpacity(0.85),
                ],
                stops: const [0.0, 0.4, 0.8],
              ),
            ),
          ),
        ),
        // Logo and Language Toggle App Bar
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Image.asset(
                    'assets/images/ride-share-text-icon.png',
                    height: 30,
                    fit: BoxFit.contain,
                  ),
                  const LanguageToggle(),
                ],
              ),
            ),
          ),
        ),
        // Welcome content and buttons
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    l10n.welcomeTitle,
                    style: const TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: () {
                      debugPrint('[WelcomeScreen] Get Started button clicked');
                      onRegister();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      l10n.getStarted,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextButton(
                    onPressed: () {
                      debugPrint('[WelcomeScreen] Ready to ride rider link clicked');
                    },
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          l10n.readyToRide,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 16),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
