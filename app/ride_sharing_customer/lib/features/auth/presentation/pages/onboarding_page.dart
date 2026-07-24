import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../injection_container.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startAutoRevolve();
  }

  void _startAutoRevolve() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(milliseconds: 2500), (timer) {
      if (_pageController.hasClients) {
        if (_currentIndex < _slides.length - 1) {
          final nextIndex = _currentIndex + 1;
          _pageController.animateToPage(
            nextIndex,
            duration: const Duration(milliseconds: 800),
            curve: Curves.easeInOut,
          );
          if (nextIndex == _slides.length - 1) {
            _timer?.cancel();
          }
        } else {
          _timer?.cancel();
        }
      }
    });
  }

  final List<Map<String, dynamic>> _slides = [
    {
      'image': 'assets/images/onboarding_1.png',
      'titleWidget': Column(
        children: [
          RichText(
            textAlign: TextAlign.center,
            text: const TextSpan(
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                height: 1.25,
                fontFamily: 'SF Pro Display',
              ),
              children: [
                TextSpan(
                  text: 'Welcome to\n',
                  style: TextStyle(color: Color(0xFF0A2540)),
                ),
                TextSpan(
                  text: 'Ryva ',
                  style: TextStyle(color: Color(0xFF009048)),
                ),
                TextSpan(
                  text: 'Ride',
                  style: TextStyle(color: Color(0xFF0A52C5)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFF009048),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ],
      ),
      'description': 'Your everyday travel partner.\nSafe rides. Shared journeys.',
    },
    {
      'image': 'assets/images/onboarding_2.png',
      'titleWidget': Column(
        children: [
          RichText(
            textAlign: TextAlign.center,
            text: const TextSpan(
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                height: 1.25,
                fontFamily: 'SF Pro Display',
              ),
              children: [
                TextSpan(
                  text: 'Safe & ',
                  style: TextStyle(color: Color(0xFF0A2540)),
                ),
                TextSpan(
                  text: 'Reliable',
                  style: TextStyle(color: Color(0xFF009048)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFF009048),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ],
      ),
      'description': 'Verified drivers, real-time tracking\nand SOS support for your safety.',
    },
    {
      'image': 'assets/images/onboarding_3.png',
      'titleWidget': Column(
        children: [
          RichText(
            textAlign: TextAlign.center,
            text: const TextSpan(
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                height: 1.25,
                fontFamily: 'SF Pro Display',
              ),
              children: [
                TextSpan(
                  text: 'Affordable &\n',
                  style: TextStyle(color: Color(0xFF0A2540)),
                ),
                TextSpan(
                  text: 'Convenient',
                  style: TextStyle(color: Color(0xFF009048)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFF009048),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ],
      ),
      'description': 'Great prices, multiple ride options\nand a seamless booking experience.',
    },
  ];

  void _onFinish() async {
    _timer?.cancel();
    final storage = sl<StorageService>();
    final token = await storage.getToken();
    if (mounted) {
      if (token != null && token.isNotEmpty) {
        context.go('/signup');
      } else {
        context.go('/login');
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _currentIndex == _slides.length - 1;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Top Header Bar with Skip Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
              child: Align(
                alignment: Alignment.topRight,
                child: TextButton(
                  onPressed: _onFinish,
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF4A5568),
                    minimumSize: Size.zero,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  child: const Text(
                    'Skip',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF4A5568),
                    ),
                  ),
                ),
              ),
            ),
            // Middle PageView Content
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() {
                    _currentIndex = index;
                  });
                },
                itemCount: _slides.length,
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Onboarding Image Illustration
                        Image.asset(
                          slide['image'] as String,
                          height: MediaQuery.of(context).size.height * 0.35,
                          fit: BoxFit.contain,
                        ),
                        const SizedBox(height: 36),
                        // Title Widget with underline green bar
                        slide['titleWidget'] as Widget,
                        const SizedBox(height: 16),
                        // Description Text
                        Text(
                          slide['description'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF4A5568),
                            height: 1.45,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            // Bottom Section: Dots & Action Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
              child: Column(
                children: [
                  // Dot Indicators
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      _slides.length,
                      (index) => Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _currentIndex == index
                              ? const Color(0xFF009048)
                              : const Color(0xFFCBD5E1),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Next / Get Started Action Button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: () {
                        if (isLast) {
                          _onFinish();
                        } else {
                          _pageController.nextPage(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeInOut,
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        isLast ? 'Get Started' : 'Next',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
