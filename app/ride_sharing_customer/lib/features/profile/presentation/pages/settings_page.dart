import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/theme/theme_bloc.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  bool _pushNotifications = true;
  bool _emailReceipts = true;

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
                    },
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
}
