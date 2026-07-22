import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';

class HelpPage extends StatelessWidget {
  const HelpPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Help & Support',
          style: TextStyle(color: Color(0xFF021B47), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  'How can we help you?',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF021B47),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Select a topic to get started',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF8A94A6),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 20),

                // Help Topics
                _buildHelpTopicCard(
                  icon: Icons.directions_car_filled_outlined,
                  title: 'Ride Issues',
                  subtitle: 'I had an issue with my ride',
                ),
                _buildHelpTopicCard(
                  icon: Icons.payments_outlined,
                  title: 'Payments',
                  subtitle: 'I have a payment related issue',
                ),
                _buildHelpTopicCard(
                  icon: Icons.account_circle_outlined,
                  title: 'Account & Profile',
                  subtitle: 'Update your account information',
                ),
                _buildHelpTopicCard(
                  icon: Icons.shield_outlined,
                  title: 'Safety & Security',
                  subtitle: 'Report a safety concern',
                ),
                _buildHelpTopicCard(
                  icon: Icons.info_outline_rounded,
                  title: 'General Queries',
                  subtitle: 'Other issues and queries',
                ),
              ],
            ),
          ),

          // Bottom Chat with Support button
          Padding(
            padding: const EdgeInsets.only(left: 16, right: 16, bottom: 24),
            child: SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Chat with Support session opened.')),
                  );
                },
                icon: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF01A34D)),
                label: const Text(
                  'Chat with Support',
                  style: TextStyle(
                    color: Color(0xFF01A34D),
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF01A34D)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHelpTopicCard({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E7E9)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF01A34D).withOpacity(0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: const Color(0xFF01A34D), size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF021B47),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF8A94A6),
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.grey),
        ],
      ),
    );
  }
}
