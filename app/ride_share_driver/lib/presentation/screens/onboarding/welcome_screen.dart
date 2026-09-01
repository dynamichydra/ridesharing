import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import '../../../core/localization/app_localizations.dart';

import 'widgets/three_dots_loader.dart';

class LanguageToggle extends StatelessWidget {

  const LanguageToggle({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = LocaleController.of(context);
    if (controller == null) return const SizedBox.shrink();

    final currentLang = controller.locale.languageCode == 'hi'
        ? 'हिंदी'
        : 'English';

    return PopupMenuButton<String>(
      position: PopupMenuPosition.under, // Opens below the button

      offset: const Offset(0, 8),

      color: Colors.black.withOpacity(0.10), // Transparent background
      surfaceTintColor: Colors.transparent,
      elevation: 0,

      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Colors.white, width: 1),
      ),

      onSelected: (langCode) {
        controller.changeLanguage(langCode);
      },

      itemBuilder: (context) => const [
        PopupMenuItem<String>(
          value: 'en',
          child: Text(
            'English',
            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
          ),
        ),
        PopupMenuItem<String>(
          value: 'hi',
          child: Text(
            'हिंदी',
            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
          ),
        ),
      ],

      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.10),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.language_rounded, size: 16, color: Colors.white),
            const SizedBox(width: 6),
            Text(
              currentLang,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 4),
            const Icon(
              Icons.keyboard_arrow_down_rounded,
              size: 16,
              color: Colors.white,
            ),
          ],
        ),
      ),
    );
  }
}

class WelcomeScreen extends StatefulWidget {
  final VoidCallback onRegister;
  final VoidCallback onLogin;
  final bool isLoading;

  const WelcomeScreen({
    super.key,
    required this.onRegister,
    required this.onLogin,
    this.isLoading = false,
  });

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _entranceController;
  late final Animation<double> _logoOpacity;
  late final Animation<Offset> _logoSlide;
  late final Animation<double> _titleOpacity;
  late final Animation<Offset> _titleSlide;
  late final Animation<double> _buttonOpacity;
  late final Animation<Offset> _buttonSlide;
  late final Animation<double> _linkOpacity;

  bool _isButtonPressed = false;

  @override
  void initState() {
    super.initState();
    _entranceController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    // Logo: 0ms–400ms
    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
      ),
    );
    _logoSlide = Tween<Offset>(begin: const Offset(0, -0.3), end: Offset.zero).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOutCubic),
      ),
    );

    // Title: 150ms–550ms
    _titleOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.2, 0.7, curve: Curves.easeOut),
      ),
    );
    _titleSlide = Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.2, 0.7, curve: Curves.easeOutCubic),
      ),
    );

    // Button: 350ms–750ms
    _buttonOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.45, 0.95, curve: Curves.easeOut),
      ),
    );
    _buttonSlide = Tween<Offset>(begin: const Offset(0, 0.2), end: Offset.zero).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.45, 0.95, curve: Curves.easeOutCubic),
      ),
    );

    // Link: 500ms–800ms
    _linkOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.6, 1.0, curve: Curves.easeOut),
      ),
    );

    _entranceController.forward();
  }

  @override
  void dispose() {
    _entranceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return AnimatedBuilder(
      animation: _entranceController,
      builder: (context, _) {
        return Stack(
          children: [
            // Logo and Language Toggle App Bar
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                child: SlideTransition(
                  position: _logoSlide,
                  child: FadeTransition(
                    opacity: _logoOpacity,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24.0,
                        vertical: 16.0,
                      ),
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
              ),
            ),
            // Welcome content and buttons
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24.0,
                    vertical: 24.0,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SlideTransition(
                        position: _titleSlide,
                        child: FadeTransition(
                          opacity: _titleOpacity,
                          child: Text(
                            l10n.welcomeTitle,
                            style: const TextStyle(
                              fontSize: 34,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              height: 1.2,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
                      SlideTransition(
                        position: _buttonSlide,
                        child: FadeTransition(
                          opacity: _buttonOpacity,
                          child: GestureDetector(
                            onTapDown: (_) => setState(() => _isButtonPressed = true),
                            onTapUp: (_) {
                              setState(() => _isButtonPressed = false);
                              if (!widget.isLoading) {
                                debugPrint('[WelcomeScreen] Get Started button clicked');
                                widget.onRegister();
                              }
                            },
                            onTapCancel: () => setState(() => _isButtonPressed = false),
                            child: AnimatedScale(
                              scale: _isButtonPressed ? 0.97 : 1.0,
                              duration: const Duration(milliseconds: 120),
                              curve: Curves.easeInOut,
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 18),
                                decoration: BoxDecoration(
                                  color: widget.isLoading
                                      ? AppColors.primary.withOpacity(0.6)
                                      : AppColors.primary,
                                  borderRadius: BorderRadius.circular(30),
                                ),
                                alignment: Alignment.center,
                                child: widget.isLoading
                                    ? const ThreeDotsLoader()
                                    : Text(
                                        l10n.getStarted,
                                        style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                        ),
                                      ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      FadeTransition(
                        opacity: _linkOpacity,
                        child: TextButton(
                          onPressed: () {
                            debugPrint(
                              '[WelcomeScreen] Ready to ride rider link clicked',
                            );
                          },
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                l10n.readyToRide,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Icon(
                                Icons.arrow_forward_rounded,
                                color: Colors.white,
                                size: 16,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
