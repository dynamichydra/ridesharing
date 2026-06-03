import 'package:flutter/material.dart';

class CustomButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isOutlined;
  final Color? backgroundColor;
  final Color? textColor;
  final double? width;

  const CustomButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.isOutlined = false,
    this.backgroundColor,
    this.textColor,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final buttonWidth = width ?? double.infinity;

    Widget childWidget = isLoading
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(
                isOutlined
                    ? (textColor ?? theme.colorScheme.primary)
                    : (textColor ?? theme.colorScheme.onPrimary),
              ),
            ),
          )
        : Text(text);

    return SizedBox(
      width: buttonWidth,
      height: 54,
      child: isOutlined
          ? OutlinedButton(
              onPressed: isLoading ? null : onPressed,
              style: theme.outlinedButtonTheme.style?.copyWith(
                foregroundColor: textColor != null ? MaterialStateProperty.all(textColor) : null,
                side: textColor != null
                    ? MaterialStateProperty.all(BorderSide(color: textColor!, width: 1.5))
                    : null,
              ),
              child: childWidget,
            )
          : ElevatedButton(
              onPressed: isLoading ? null : onPressed,
              style: theme.elevatedButtonTheme.style?.copyWith(
                backgroundColor: backgroundColor != null ? MaterialStateProperty.all(backgroundColor) : null,
                foregroundColor: textColor != null ? MaterialStateProperty.all(textColor) : null,
              ),
              child: childWidget,
            ),
    );
  }
}
