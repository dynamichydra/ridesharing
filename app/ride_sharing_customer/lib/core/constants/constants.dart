import 'package:flutter/material.dart';

class AppColors {
  // Common Colors
  static const Color primaryBlue = Color(0xFF01A34D); // Green (#01a34d) as primary brand color
  static const Color secondaryBlue = Color(0xFF0165B7); // Blue (#0165b7) as secondary brand color
  static const Color successGreen = Color(0xFF01A34D); // Green Accent
  static const Color warningOrange = Color(0xFFFFC800); // Yellow/Orange
  static const Color errorRed = Color(0xFFE53935); // Danger Red

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

class CountryConfig {
  final String name;
  final String isoCode;
  final String dialCode;
  final String currencySymbol;
  final String currencyCode;
  final String distanceUnit;

  const CountryConfig({
    required this.name,
    required this.isoCode,
    required this.dialCode,
    required this.currencySymbol,
    required this.currencyCode,
    this.distanceUnit = 'km',
  });

  static const List<CountryConfig> supportedCountries = [
    CountryConfig(
      name: 'India',
      isoCode: 'IN',
      dialCode: '+91',
      currencySymbol: '₹',
      currencyCode: 'INR',
    ),
    CountryConfig(
      name: 'Canada',
      isoCode: 'CA',
      dialCode: '+1',
      currencySymbol: '\$',
      currencyCode: 'CAD',
    ),
  ];
}

class AppConstants {
  static String currencySymbol = '₹';
  static const String distanceUnit = 'km';
}

