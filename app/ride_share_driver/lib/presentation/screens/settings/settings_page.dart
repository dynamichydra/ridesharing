import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../style/appcolors.dart';
import '../../../common/entities/driver_profile.dart';

class SettingsPage extends StatefulWidget {
  final DriverProfile? driver;
  final VoidCallback onLogout;

  const SettingsPage({super.key, this.driver, required this.onLogout});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  bool _rideNotifications = true;
  bool _earningsUpdates = true;
  bool _promotionalAlerts = false;

  Future<void> _confirmLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Log Out?', style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text('You will need to sign in again to accept rides.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Log Out'),
          ),
        ],
      ),
    );
    if (confirmed == true) widget.onLogout();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Settings', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: AppColors.border.withOpacity(0.4), height: 1),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Account info banner
          if (widget.driver != null)
            Container(
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.secondary, AppColors.primary], begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(children: [
                const CircleAvatar(
                  radius: 26,
                  backgroundColor: Colors.white24,
                  child: Icon(Icons.person, color: Colors.white, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(widget.driver!.name ?? 'Driver', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text(widget.driver!.phone ?? '', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
                ])),
                Text('${widget.driver!.rating.toStringAsFixed(1)} ★',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              ]),
            ),

          _sectionHeader('Subscription & Plan'),
          _navTile(
            icon: Icons.card_membership_rounded,
            iconColor: AppColors.secondary,
            title: 'Manage Subscription',
            trailing: widget.driver?.subscriptionStatus == 'active' ? 'Active' : 'Get Plan',
            onTap: () => context.push('/subscription'),
          ),

          const SizedBox(height: 8),
          _sectionHeader('Notifications'),
          _switchTile(
            icon: Icons.notifications_active_rounded,
            iconColor: AppColors.primary,
            title: 'Ride Requests',
            subtitle: 'Get notified for new ride offers',
            value: _rideNotifications,
            onChanged: (v) => setState(() => _rideNotifications = v),
          ),
          _switchTile(
            icon: Icons.account_balance_wallet_rounded,
            iconColor: AppColors.secondary,
            title: 'Earnings Updates',
            subtitle: 'Payment confirmations and payouts',
            value: _earningsUpdates,
            onChanged: (v) => setState(() => _earningsUpdates = v),
          ),
          _switchTile(
            icon: Icons.campaign_rounded,
            iconColor: Colors.teal,
            title: 'Promotions & Offers',
            subtitle: 'Bonuses and incentive alerts',
            value: _promotionalAlerts,
            onChanged: (v) => setState(() => _promotionalAlerts = v),
          ),

          const SizedBox(height: 8),
          _sectionHeader('Support'),
          _navTile(icon: Icons.help_outline_rounded, iconColor: Colors.teal, title: 'Help & Support', onTap: () {}),
          _navTile(icon: Icons.privacy_tip_outlined, iconColor: AppColors.secondary, title: 'Privacy Policy', onTap: () {}),
          _navTile(icon: Icons.description_outlined, iconColor: AppColors.primary, title: 'Terms of Service', onTap: () {}),
          _navTile(icon: Icons.info_outline_rounded, iconColor: AppColors.textSecondary, title: 'App Version', trailing: 'v1.0.2', onTap: () {}),

          const SizedBox(height: 8),
          _sectionHeader('Account'),
          _dangerTile(
            icon: Icons.logout_rounded,
            title: 'Log Out',
            onTap: _confirmLogout,
          ),
          const SizedBox(height: 32),

          Center(
            child: Text(
              'Driver Partner App • v1.0.2',
              style: TextStyle(color: AppColors.textSecondary.withOpacity(0.5), fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(title,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.textSecondary, letterSpacing: 0.8)),
    );
  }

  Widget _switchTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border.withOpacity(0.5)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: iconColor.withOpacity(0.08), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
        trailing: Switch(
          value: value,
          onChanged: onChanged,
          activeColor: AppColors.primary,
        ),
      ),
    );
  }

  Widget _navTile({required IconData icon, required Color iconColor, required String title, String? trailing, required VoidCallback onTap}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border.withOpacity(0.5)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: iconColor.withOpacity(0.08), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
        trailing: trailing != null
            ? Text(trailing, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12))
            : Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary.withOpacity(0.4)),
        onTap: onTap,
      ),
    );
  }

  Widget _dangerTile({required IconData icon, required String title, required VoidCallback onTap}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.error.withOpacity(0.2)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: AppColors.error.withOpacity(0.08), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: AppColors.error, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.error)),
        trailing: Icon(Icons.chevron_right_rounded, color: AppColors.error.withOpacity(0.4)),
        onTap: onTap,
      ),
    );
  }
}
