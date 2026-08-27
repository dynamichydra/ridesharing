import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import 'widgets/three_dots_loader.dart';

class _StatusConfig {
  final IconData icon;
  final Color color;
  final String title;
  final String message;
  const _StatusConfig({
    required this.icon,
    required this.color,
    required this.title,
    required this.message,
  });
}

/// Persistent screen for every `registrationStatus` where the wizard's normal
/// step flow doesn't apply: the driver has nothing left to fill in
/// (`pending_review`, `under_verification`), can't proceed at all
/// (`suspended`), or was rejected and needs an explicit choice to go back in
/// and fix something (`rejected`) rather than being logged out immediately.
class RegistrationStatusScreen extends StatelessWidget {
  final String status;
  final String? note;
  final bool isLoading;
  final VoidCallback? onEditAndResubmit;
  final VoidCallback onLogout;

  const RegistrationStatusScreen({
    super.key,
    required this.status,
    this.note,
    this.isLoading = false,
    this.onEditAndResubmit,
    required this.onLogout,
  });

  _StatusConfig get _config {
    switch (status) {
      case 'pending_review':
        return const _StatusConfig(
          icon: Icons.hourglass_top_rounded,
          color: AppColors.info,
          title: 'Application Under Review',
          message:
              "We're reviewing your details and documents. We'll notify you as soon as a decision is made.",
        );
      case 'under_verification':
        return const _StatusConfig(
          icon: Icons.fact_check_rounded,
          color: AppColors.info,
          title: 'Verification In Progress',
          message: 'An admin is currently reviewing your application.',
        );
      case 'rejected':
        return _StatusConfig(
          icon: Icons.cancel_rounded,
          color: AppColors.error,
          title: 'Application Rejected',
          message: (note != null && note!.isNotEmpty)
              ? note!
              : 'Your application was rejected. Please contact support for details.',
        );
      case 'suspended':
        return _StatusConfig(
          icon: Icons.block_rounded,
          color: AppColors.error,
          title: 'Account Suspended',
          message: (note != null && note!.isNotEmpty)
              ? note!
              : 'Your account has been suspended. Please contact support.',
        );
      default:
        return _StatusConfig(
          icon: Icons.info_outline_rounded,
          color: AppColors.textSecondary,
          title: 'Account Status',
          message: 'Current status: $status',
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final config = _config;
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(config.icon, size: 72, color: config.color),
              const SizedBox(height: 24),
              Text(
                config.title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                config.message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 15,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 32),
              if (onEditAndResubmit != null) ...[
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : onEditAndResubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: isLoading
                        ? const ThreeDotsLoader()
                        : const Text('Edit & Resubmit'),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: onLogout,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Log Out'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
