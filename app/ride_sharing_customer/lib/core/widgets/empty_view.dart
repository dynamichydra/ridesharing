import 'package:flutter/material.dart';
import '../constants/constants.dart';

class EmptyView extends StatelessWidget {
  final String title;
  final String message;
  final IconData icon;

  const EmptyView({
    super.key,
    required this.title,
    required this.message,
    this.icon = Icons.inbox_outlined,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final iconColor = theme.brightness == Brightness.light ? Colors.grey[400]! : Colors.grey[600]!;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.l),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: iconColor,
              size: 72,
            ),
            const SizedBox(height: AppSpacing.m),
            Text(
              title,
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.s),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}
