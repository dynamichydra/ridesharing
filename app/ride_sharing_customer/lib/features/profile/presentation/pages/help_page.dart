import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';

class HelpPage extends StatelessWidget {
  const HelpPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final List<Map<String, String>> faqs = [
      {
        'q': 'How do I request a ride?',
        'a': 'Simply enter your destination on the home screen, select the ride category that fits your needs, verify your payment card, and click Confirm.'
      },
      {
        'q': 'How do I add funds to my wallet?',
        'a': 'Go to the Wallet screen in the side drawer, click "+ Add Funds", select or enter your desired amount, choose your payment method, and complete the top up.'
      },
      {
        'q': 'What vehicle categories are available?',
        'a': 'Auto offers cheap daily rickshaw trips. Mini provides hatchbacks for everyday travel. Sedan offers comfortable sedan rides, and SUV supports groups of up to 6.'
      },
      {
        'q': 'Is my payment secure?',
        'a': 'Absolutely! All payments are processed using industry-standard tokens and encrypted locally in your secure keychain.'
      }
    ];

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: const Text('Help & Support'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // FAQs header
            Text(
              'Frequently Asked Questions',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.m),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: faqs.length,
              itemBuilder: (context, index) {
                final faq = faqs[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: AppSpacing.s),
                  child: ExpansionTile(
                    title: Text(
                      faq['q']!,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
                        child: Text(
                          faq['a']!,
                          style: theme.textTheme.bodyMedium?.copyWith(height: 1.5),
                        ),
                      )
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: AppSpacing.xl),
            
            // Support contact cards
            Text(
              'Contact Support',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.m),
            Card(
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(AppSpacing.s),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.grey[850] : Colors.grey[100],
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.support_agent_rounded, color: AppColors.primaryBlue),
                ),
                title: const Text('Live Chat Support'),
                subtitle: const Text('Average response: 2 minutes'),
                trailing: const Icon(Icons.chat_bubble_outline_rounded, color: AppColors.primaryBlue),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Starting Live Chat support instance (Mocked).')),
                  );
                },
              ),
            ),
            const SizedBox(height: AppSpacing.s),
            Card(
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(AppSpacing.s),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.grey[850] : Colors.grey[100],
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.email_outlined, color: AppColors.primaryBlue),
                ),
                title: const Text('Email Support'),
                subtitle: const Text('support@ridesharing.com'),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Composing support email (Mocked).')),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
