import 'package:flutter/material.dart';

class OfflineModeView extends StatelessWidget {
  final VoidCallback onGoOnline;

  const OfflineModeView({
    super.key,
    required this.onGoOnline,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const SizedBox(height: 30),

        // Centered Offline Power Illustration Asset
        Image.asset(
          'assets/images/offline-ui.png',
          width: 200,
          height: 180,
          fit: BoxFit.contain,
        ),

        const SizedBox(height: 18),

        // "You're offline" title
        const Text(
          "You're offline",
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0F172A),
          ),
        ),

        const SizedBox(height: 8),

        // Subtitle
        const Text(
          'Go online to start receiving\nride requests and earn.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14,
            height: 1.4,
            color: Color(0xFF64748B),
          ),
        ),

        const SizedBox(height: 28),

        // "Go Online" outline button with green power icon centered
        Center(
          child: SizedBox(
            width: MediaQuery.of(context).size.width * 0.60,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: onGoOnline,
              icon: const Icon(
                Icons.power_settings_new_rounded,
                color: Color(0xFF009048),
                size: 18,
              ),
              label: const Text(
                'Go Online',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF009048),
                ),
              ),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                side: const BorderSide(color: Color(0xFF009048), width: 1.2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                backgroundColor: Colors.white,
              ),
            ),
          ),
        ),

        const SizedBox(height: 36),

        // Bottom Info Cards (Drive Safe, Keep documents updated, Need help?)
        // Container(
        //   decoration: BoxDecoration(
        //     color: const Color(0xFFFAFAFA),
        //     borderRadius: BorderRadius.circular(16),
        //     border: Border.all(color: const Color(0xFFF1F5F9)),
        //   ),
        //   child: Column(
        //     children: [
        //       _buildInfoTile(
        //         icon: Icons.verified_user_rounded,
        //         iconColor: const Color(0xFF009048),
        //         title: 'Drive safe',
        //         subtitle: 'Your safety is our priority',
        //         onTap: () {},
        //       ),
        //       const Divider(height: 1, indent: 56, endIndent: 16, color: Color(0xFFF1F5F9)),
        //       _buildInfoTile(
        //         icon: Icons.description_outlined,
        //         iconColor: const Color(0xFF0F172A),
        //         title: 'Keep documents updated',
        //         subtitle: 'Ensure a smooth experience',
        //         onTap: () => context.push('/profile'),
        //       ),
        //       const Divider(height: 1, indent: 56, endIndent: 16, color: Color(0xFFF1F5F9)),
        //       _buildInfoTile(
        //         icon: Icons.headset_mic_outlined,
        //         iconColor: const Color(0xFF0F172A),
        //         title: 'Need help?',
        //         subtitle: 'Contact support anytime',
        //         onTap: () => context.push('/profile'),
        //       ),
        //     ],
        //   ),
        // ),
      ],
    );
  }

  // Widget _buildInfoTile({
  //   required IconData icon,
  //   required Color iconColor,
  //   required String title,
  //   required String subtitle,
  //   required VoidCallback onTap,
  // }) {
  //   return InkWell(
  //     onTap: onTap,
  //     borderRadius: BorderRadius.circular(16),
  //     child: Padding(
  //       padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
  //       child: Row(
  //         children: [
  //           Container(
  //             width: 36,
  //             height: 36,
  //             decoration: BoxDecoration(
  //               color: Colors.white,
  //               borderRadius: BorderRadius.circular(10),
  //               border: Border.all(color: const Color(0xFFE2E8F0)),
  //             ),
  //             child: Icon(icon, color: iconColor, size: 20),
  //           ),
  //           const SizedBox(width: 14),
  //           Expanded(
  //             child: Column(
  //               crossAxisAlignment: CrossAxisAlignment.start,
  //               children: [
  //                 Text(
  //                   title,
  //                   style: const TextStyle(
  //                     fontSize: 14,
  //                     fontWeight: FontWeight.bold,
  //                     color: Color(0xFF0F172A),
  //                   ),
  //                 ),
  //                 const SizedBox(height: 2),
  //                 Text(
  //                   subtitle,
  //                   style: const TextStyle(
  //                     fontSize: 12,
  //                     color: Color(0xFF64748B),
  //                   ),
  //                 ),
  //               ],
  //             ),
  //           ),
  //           const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8), size: 20),
  //         ],
  //       ),
  //     ),
  //   );
  // }
}
