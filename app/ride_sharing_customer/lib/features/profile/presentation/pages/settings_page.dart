import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/theme/theme_bloc.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../../../../injection_container.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../wallet/presentation/bloc/wallet_bloc.dart';
import '../bloc/profile_bloc.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  bool _pushNotifications = true;
  bool _emailReceipts = true;

  @override
  void initState() {
    super.initState();
    final storage = sl<StorageService>();
    _pushNotifications = storage.getCachedData('settings_push_alerts') as bool? ?? true;
    _emailReceipts = storage.getCachedData('settings_email_receipts') as bool? ?? true;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: const Text('App Settings'),
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
            Text(
              'Appearance',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.m),
            Card(
              child: SwitchListTile(
                title: const Text(
                  'Dark Theme Mode',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: const Text('Adjust system appearance'),
                secondary: const Icon(Icons.dark_mode_rounded, color: AppColors.primaryBlue),
                value: isDark,
                onChanged: (val) {
                  context.read<ThemeBloc>().add(ToggleTheme(val));
                },
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            
            Text(
              'Notifications',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.m),
            Card(
              child: Column(
                children: [
                  SwitchListTile(
                    title: const Text('Push Alerts'),
                    subtitle: const Text('Notify about arrivals and receipt details'),
                    value: _pushNotifications,
                    onChanged: (val) {
                      setState(() {
                        _pushNotifications = val;
                      });
                      sl<StorageService>().cacheData('settings_push_alerts', val);
                    },
                  ),
                  const Divider(height: 1),
                  SwitchListTile(
                    title: const Text('Email Receipts'),
                    subtitle: const Text('Send billing invoices to profile email'),
                    value: _emailReceipts,
                    onChanged: (val) {
                      setState(() {
                        _emailReceipts = val;
                      });
                      sl<StorageService>().cacheData('settings_email_receipts', val);
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            Text(
              'System Actions',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.m),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.cleaning_services_rounded, color: AppColors.primaryBlue),
                    title: const Text('Clear App Cache'),
                    subtitle: const Text('Resets local database and mock cache'),
                    onTap: () => _confirmClearCache(context),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: Icon(Icons.delete_forever_rounded, color: theme.colorScheme.error),
                    title: Text(
                      'Delete Account',
                      style: TextStyle(color: theme.colorScheme.error, fontWeight: FontWeight.bold),
                    ),
                    subtitle: const Text('Permanently remove profile data'),
                    onTap: () => _confirmDeleteAccount(context),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            
            Text(
              'About App',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.m),
            Card(
              child: const Column(
                children: [
                  ListTile(
                    title: Text('Version'),
                    trailing: Text('1.0.0 (MVP Prototype)'),
                  ),
                  Divider(height: 1),
                  ListTile(
                    title: Text('Developer'),
                    trailing: Text('Ride Sharing Team'),
                  ),
                  Divider(height: 1),
                  ListTile(
                    title: Text('Architecture'),
                    trailing: Text('Clean Architecture + BLoC'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmClearCache(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Clear Cache?'),
        content: const Text('This will reset your local profile, transactions, wallet balance, and ride history mock data. The app will restart.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(dialogContext);
              final storage = sl<StorageService>();
              await storage.clearCache();
              await storage.clearAuth();
              
              if (context.mounted) {
                context.read<AuthBloc>().add(LoggedOut());
                context.read<ProfileBloc>().add(LoadProfile());
                context.read<WalletBloc>().add(LoadWalletDetails());
                context.go('/login');
                CustomToast.show(context, 'App cache cleared. Mock data re-initialized.');
              }
            },
            child: const Text('Clear', style: TextStyle(color: AppColors.errorRed)),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteAccount(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete Account?'),
        content: const Text('Are you sure you want to permanently delete your account? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(dialogContext);
              final storage = sl<StorageService>();
              await storage.clearCache();
              await storage.clearAuth();
              
              if (context.mounted) {
                context.read<AuthBloc>().add(LoggedOut());
                context.read<ProfileBloc>().add(LoadProfile());
                context.read<WalletBloc>().add(LoadWalletDetails());
                context.go('/login');
                CustomToast.show(context, 'Account deleted successfully.');
              }
            },
            child: const Text('Delete', style: TextStyle(color: AppColors.errorRed)),
          ),
        ],
      ),
    );
  }
}
