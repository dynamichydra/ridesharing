import 'package:flutter/material.dart';

class AppColors {
  // Common Colors
  static const Color primaryBlue = Color(0xFF276EF1); // Electric Blue
  static const Color successGreen = Color(0xFF05A357); // Green Accent
  static const Color warningOrange = Color(0xFFFF9900); // Warning/Orange
  static const Color errorRed = Color(0xFFE11900); // Danger Red

  // Light Theme Colors
  static const Color lightPrimary = Color(0xFF0F0F10);
  static const Color lightBackground = Color(0xFFF6F6F9);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightTextPrimary = Color(0xFF000000);
  static const Color lightTextSecondary = Color(0xFF6B6B76);
  static const Color lightDivider = Color(0xFFEEEEF2);

  // Dark Theme Colors
  static const Color darkPrimary = Color(0xFFFFFFFF);
  static const Color darkBackground = Color(0xFF121214);
  static const Color darkSurface = Color(0xFF1E1E22);
  static const Color darkTextPrimary = Color(0xFFFFFFFF);
  static const Color darkTextSecondary = Color(0xFF9E9EAE);
  static const Color darkDivider = Color(0xFF2D2D34);
}

class AppSpacing {
  static const double xs = 4.0;
  static const double s = 8.0;
  static const double m = 16.0;
  static const double l = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
}

class AppRadius {
  static const double s = 4.0;
  static const double m = 8.0;
  static const double l = 16.0;
  static const double xl = 24.0;
  static const double rounded = 999.0;
}

class AppMockAssets {
  static const String users = 'assets/mock/users.json';
  static const String rides = 'assets/mock/rides.json';
  static const String rideHistory = 'assets/mock/ride_history.json';
  static const String notifications = 'assets/mock/notifications.json';
  static const String wallet = 'assets/mock/wallet.json';
  static const String vehicles = 'assets/mock/vehicles.json';
}

class AppConstants {
  static const String currencySymbol = '₹';
  static const String distanceUnit = 'km';
}
