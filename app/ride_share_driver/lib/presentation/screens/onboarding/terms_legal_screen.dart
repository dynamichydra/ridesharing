import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';

class TermsLegalScreen extends StatefulWidget {
  final String termsContent;
  final bool isAlreadyAccepted;
  final VoidCallback onAccepted;

  const TermsLegalScreen({
    super.key,
    required this.termsContent,
    this.isAlreadyAccepted = false,
    required this.onAccepted,
  });

  @override
  State<TermsLegalScreen> createState() => _TermsLegalScreenState();
}

class _TermsLegalScreenState extends State<TermsLegalScreen> {
  late bool _scrolledToEnd;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrolledToEnd = widget.isAlreadyAccepted;
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >=
          _scrollController.position.maxScrollExtent - 20) {
        if (!_scrolledToEnd) {
          debugPrint('[TermsLegalScreen] Scrolled to end of terms');
          setState(() {
            _scrolledToEnd = true;
          });
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: AppColors.surface,
          child: const Text(
            'Terms & Privacy Policy',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            controller: _scrollController,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.termsContent.isNotEmpty
                      ? widget.termsContent
                      : 'Welcome to Lyft Partner Driver India. By signing up, you agree to our driving rules and platform terms. Please scroll down to review and agree.\n\n'
                            '1. Platform Matching Policy\n'
                            'We match partners with riders within a reasonable distance. Surge rates may apply dynamically during traffic spikes, peak hours, and airport pickups.\n\n'
                            '2. Payment Terms\n'
                            'Payouts will be processed to the registered bank account after verifying Aadhaar card details, driving licence compliance, and other required information.\n\n'
                            '3. Driver Eligibility\n'
                            'Partners must hold a valid driving licence, vehicle registration certificate, insurance, and all permits required under applicable Indian laws.\n\n'
                            '4. Vehicle Standards\n'
                            'Vehicles must be maintained in a safe, clean, and roadworthy condition. Regular inspections may be required to ensure compliance with platform standards.\n\n'
                            '5. Rider Safety\n'
                            'Partners must follow all traffic laws, drive responsibly, and take reasonable steps to ensure the safety and comfort of riders throughout every trip.\n\n'
                            '6. Cancellation Policy\n'
                            'Frequent or unjustified cancellations may affect your account status. Partners should accept and complete confirmed rides whenever reasonably possible.\n\n'
                            '7. Fare and Charges\n'
                            'Trip fares are calculated based on factors such as distance, time, demand, tolls, taxes, and other applicable platform charges.\n\n'
                            '8. Code of Conduct\n'
                            'Partners must treat riders respectfully and must not engage in harassment, discrimination, threatening behaviour, or other inappropriate conduct.\n\n'
                            '9. Account and Data Security\n'
                            'Partners are responsible for keeping their account credentials secure and ensuring that all personal, vehicle, and payment information remains accurate and up to date.\n\n'
                            '10. Platform Compliance\n'
                            'Continued access to the platform requires compliance with these terms, applicable laws, safety requirements, and future policy updates communicated through the app.',
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(24),
          child: ElevatedButton(
            // Encourage reading terms
            onPressed: () {
              debugPrint(
                '[TermsLegalScreen] Accept button clicked. scrolledToEnd: $_scrolledToEnd',
              );
              if (_scrolledToEnd) {
                widget.onAccepted();
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: _scrolledToEnd ? AppColors.primary : Colors.grey,
            ),
            child: Text(
              _scrolledToEnd ? 'I Agree & Continue' : 'Scroll down to read',
            ),
          ),
        ),
      ],
    );
  }
}
