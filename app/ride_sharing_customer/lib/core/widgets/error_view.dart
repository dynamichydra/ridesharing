import 'package:flutter/material.dart';
import '../constants/constants.dart';
import 'custom_button.dart';

class ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const ErrorView({
    super.key,
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.l),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline_rounded,
              color: theme.colorScheme.error,
              size: 64,
            ),
            const SizedBox(height: AppSpacing.m),
            Text(
              'Oops! Something went wrong',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: AppSpacing.s),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.l),
            CustomButton(
              text: 'Try Again',
              onPressed: onRetry,
              width: 160,
            ),
          ],
        ),
      ),
    );
  }
}
