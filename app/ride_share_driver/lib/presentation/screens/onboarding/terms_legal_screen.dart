import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';

class TermsLegalScreen extends StatefulWidget {
  final String termsContent;
  final VoidCallback onAccepted;

  const TermsLegalScreen({super.key, required this.termsContent, required this.onAccepted});

  @override
  State<TermsLegalScreen> createState() => _TermsLegalScreenState();
}

class _TermsLegalScreenState extends State<TermsLegalScreen> {
  bool _scrolledToEnd = false;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 20) {
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
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.textPrimary),
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
                  widget.termsContent.isNotEmpty ? widget.termsContent : 
                  'Welcome to Lyft Partner Driver India. By signing up, you agree to our driving rules and platform terms. Please scroll down to review and agree.\n\n'
                  '1. Platform Matching Policy\nWe match partners with riders within reasonable distance. Surge rates apply dynamically during traffic spikes and airport pickups.\n\n'
                  '2. Payment Terms\nPayouts will be processed to the registered bank account details after verifying Aadhar card details and driving license compliance.',
                  style: const TextStyle(fontSize: 14, height: 1.5, color: AppColors.textSecondary),
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
              debugPrint('[TermsLegalScreen] Accept button clicked. scrolledToEnd: $_scrolledToEnd');
              if (_scrolledToEnd) {
                widget.onAccepted();
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: _scrolledToEnd ? AppColors.primary : Colors.grey,
            ),
            child: Text(_scrolledToEnd ? 'I Agree & Continue' : 'Scroll down to read'),
          ),
        ),
      ],
    );
  }
}
