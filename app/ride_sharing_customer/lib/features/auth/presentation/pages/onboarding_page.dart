import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/custom_button.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  final List<Map<String, String>> _slides = [
    {
      'title': 'Request a ride in seconds',
      'description': 'Select your pickup, destination, and choose the ride that fits your schedule and budget.',
      'icon': '🚗',
    },
    {
      'title': 'Live Driver Tracking',
      'description': 'Watch your vehicle arrive in real-time and stay informed with automatic notifications.',
      'icon': '📍',
    },
    {
      'title': 'Secure Digital Wallet',
      'description': 'Pay seamlessly with card, apple pay, or top up your account balance for direct rides.',
      'icon': '💳',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLast = _currentIndex == _slides.length - 1;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: () => context.go('/login'),
                child: Text(
                  'Skip',
                  style: TextStyle(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
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
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.l),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          slide['icon']!,
                          style: const TextStyle(fontSize: 100),
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          slide['title']!,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.m),
                        Text(
                          slide['description']!,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontSize: 16,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.l),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      _slides.length,
                      (index) => AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: _currentIndex == index ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _currentIndex == index
                              ? AppColors.primaryBlue
                              : theme.dividerColor,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  CustomButton(
                    text: isLast ? 'Get Started' : 'Next',
                    onPressed: () {
                      if (isLast) {
                        context.go('/login');
                      } else {
                        _pageController.nextPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      }
                    },
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
